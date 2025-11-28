import os
import datetime
import json
import numpy as np
import pandas as pd
import joblib
import httpx
import sys 
from typing import Tuple, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from tensorflow.keras.models import load_model
import firebase_admin
from firebase_admin import credentials, db


DEFAULT_DISTRICT = "Chennai"
BASE_PATH = os.getcwd()

MODELS_DIR = os.path.join(BASE_PATH, "trained_models_bilstm_classification_v3") 
FEATURE_COLS = ['temperature_2m', 'relative_humidity_2m', 'surface_pressure']
SEQUENCE_LENGTH = 30 

FIREBASE_KEY_PATH = "agriweather_key.json"
FIREBASE_DATABASE_URL = "https://agriweather-e5ba4-default-rtdb.firebaseio.com"
FIREBASE_DATA_PATH = "sensor_readings"
HYBRID_MAP_FILE = "district_best_model_map.json" 

LLAMA_API_URL = "http://localhost:11434/api/generate"
LLAMA_MODEL_NAME = "llama3.2:1b"

ai_resources = {}
loaded_models = {}

class ChatRequest(BaseModel):
    message: str
    district: str = DEFAULT_DISTRICT

# ==========================================
# HYBRID MODEL LOADER (Dynamic Loading Implemented)
# ==========================================
def get_model_resources(district_name: str):
    
    
    if district_name in loaded_models:
        return loaded_models[district_name]

    
    hybrid_map = ai_resources.get("hybrid_map", {})
    if district_name in hybrid_map:
        
        best_model_type = hybrid_map[district_name].lower()
    else:
        
        best_model_type = 'bilstm' 

    
    district_lower = district_name.lower().replace(" ", "_").replace("/", "_")
    default_district_lower = DEFAULT_DISTRICT.lower().replace(" ", "_").replace("/", "_")


    model_path = os.path.join(MODELS_DIR, f"rain_model_{best_model_type}_{district_lower}.h5")
    
    
    scaler_path = os.path.join(MODELS_DIR, f"scaler_{best_model_type}_{district_lower}.pkl")

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        
        if district_name != DEFAULT_DISTRICT:
             
             model_path_fallback = os.path.join(MODELS_DIR, f"rain_model_bilstm_{default_district_lower}.h5")
             scaler_path_fallback = os.path.join(MODELS_DIR, f"scaler_bilstm_{default_district_lower}.pkl")
             
             if os.path.exists(model_path_fallback) and os.path.exists(scaler_path_fallback):
                 
                 best_model_type = 'BiLSTM' 
                 model_path = model_path_fallback
                 scaler_path = scaler_path_fallback
             else:
                 print(f"DEBUG ERROR: Cannot find model for {district_name} ({best_model_type}) or default fallback.")
                 print(f"DEBUG PATHS: Model Path: {model_path}, Scaler Path: {scaler_path}")
                 return None
        else:
            print(f"DEBUG ERROR: Default model {DEFAULT_DISTRICT} ({best_model_type}) is missing.")
            print(f"DEBUG PATHS: Model Path: {model_path}, Scaler Path: {scaler_path}")
            return None 
    try:
        
        display_model_type = 'BiLSTM' if best_model_type.lower() == 'bilstm' else 'LSTM'
        
        resources = {
            "model": load_model(model_path, compile=False),
            "scaler": joblib.load(scaler_path),
            "type": display_model_type
        }
    except Exception as e:
        print(f"DEBUG FATAL: Failed to load resources for {district_name}. Exception: {e}")
        print(f"DEBUG PATHS: Model Path: {model_path}, Scaler Path: {scaler_path}")
        return None


    loaded_models[district_name] = resources
    return resources

# ==========================================
# FIREBASE READERS (NO MOCKS)
# ==========================================
def _parse_iso_ts(ts_str: str) -> datetime.datetime:
    """Parse ISO timestamp from stored keys or Time_ISO value."""
    try:
        if isinstance(ts_str, str) and ts_str.endswith("Z"):
            return datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return datetime.datetime.fromisoformat(ts_str)
    except Exception:
        return datetime.datetime.utcnow()

def get_all_readings_and_prepare_model_input() -> Tuple[pd.DataFrame, dict, str, List[Tuple[str, Dict[str, Any]]]]:
    """
    Reads ALL timestamped readings from Firebase, sorts them chronologically.
    It returns:
    1. The **latest SEQUENCE_LENGTH readings** as a DataFrame for the prediction.
    2. The latest single reading dictionary.
    3. The latest reading timestamp string.
    4. **All** sorted historical readings (list of tuples) for daily summary analysis by the LLM.
    """
    if not ai_resources.get("firebase_initialized"):
        raise HTTPException(status_code=503, detail="Firebase not connected.")

    try:
        ref = db.reference(FIREBASE_DATA_PATH)
        snapshot = ref.get()

        if not snapshot or not isinstance(snapshot, dict):
            raise HTTPException(status_code=503, detail="Firebase path empty or malformed.")

        
        items = sorted(snapshot.items(), key=lambda kv: kv[0])
        
        
        if len(items) < SEQUENCE_LENGTH:
            raise HTTPException(status_code=503, detail=f"The model requires an input sequence of {SEQUENCE_LENGTH} historical readings. Found only {len(items)}. Populate Firebase.")


        last_sequence = items[-SEQUENCE_LENGTH:]
        
        temps, hums, pres, rains = [], [], [], []
        
        for ts_key, entry in last_sequence:
            if not isinstance(entry, dict):
                raise HTTPException(status_code=500, detail=f"Malformed entry at {ts_key}.")
            try:
    
                temps.append(float(entry.get("Temp_DHT")))
                hums.append(float(entry.get("Hum_DHT")))
                pres.append(float(entry.get("Pressure_hPa")))
                rains.append(float(entry.get("Rain", 0.0)))
            except Exception as ex:
                raise HTTPException(status_code=500, detail=f"Invalid numeric sensor value at {ts_key}: {ex}")

        
        df = pd.DataFrame({
            "temperature_2m": temps,
            "relative_humidity_2m": hums,
            "surface_pressure": pres,
            "rain": rains 
        })

        latest_ts, latest_entry = last_sequence[-1][0], last_sequence[-1][1]
        latest_entry = dict(latest_entry)
        latest_entry["Time_ISO"] = latest_entry.get("Time_ISO", latest_ts)

        return df, latest_entry, latest_ts, items

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase read error: {e}")

# ==========================================
# SERVER LIFESPAN
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Firebase once
    try:
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_DATABASE_URL})
        ai_resources["firebase_initialized"] = True
        print("Firebase initialized.")
    except Exception as e:
        ai_resources["firebase_initialized"] = False
        print("Firebase init failed:", e)


    map_path = os.path.join(BASE_PATH, HYBRID_MAP_FILE) 
    try:
        with open(map_path, 'r') as f:
            ai_resources["hybrid_map"] = json.load(f)
        print("Hybrid model map loaded.")
    except Exception as e:
        ai_resources["hybrid_map"] = {}
        print(f"Warning: Hybrid map failed to load: {e}")
    
    _ = get_model_resources(DEFAULT_DISTRICT)
    yield
    loaded_models.clear()

app = FastAPI(title="Agri-Weather AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# HELPERS (Retained)
# ==========================================
def get_season_context(dt: datetime.datetime) -> str:
    m = dt.month
    if m in [10, 11, 12]:
        return "Northeast Monsoon"
    if m in [1, 2]:
        return "Winter"
    if m in [3, 4, 5]:
        return "Summer"
    return "Southwest Monsoon"

def get_daily_summary(all_items: List[Tuple[str, Dict[str, Any]]], latest_ts: str) -> str:
    """Calculates summary statistics for the current day from all available readings."""
    if not all_items:
        return "No historical data to summarize."

    latest_date = _parse_iso_ts(latest_ts).date()
    daily_readings = []

    for ts_key, entry in all_items:
        try:
            ts_date = _parse_iso_ts(ts_key).date()
            
            if ts_date == latest_date:
                daily_readings.append({
                    "temp": float(entry.get("Temp_DHT", np.nan)),
                    "hum": float(entry.get("Hum_DHT", np.nan)),
                    "soil": float(entry.get("Soil_Moisture_Raw", np.nan)),
                    "rain": float(entry.get("Rain", np.nan))
                })
        except Exception:
            continue 

    if not daily_readings:
        return f"No data found for the current day ({latest_date})."
    
    
    df_daily = pd.DataFrame(daily_readings).dropna(subset=['temp', 'hum', 'soil', 'rain'])
    
    if df_daily.empty:
        return f"No valid numeric data found for the current day ({latest_date})."

    t_avg, t_min, t_max = df_daily['temp'].agg(['mean', 'min', 'max']).round(1)
    h_avg, h_min, h_max = df_daily['hum'].agg(['mean', 'min', 'max']).round(1)
    
    soil_min = df_daily['soil'].min().round(1) 
    total_rain = df_daily['rain'].sum().round(2)
    count = len(df_daily)

    return (
        f"Daily Summary (Total {count} readings today, starting from {latest_date}): "
        f"Temp Avg/Min/Max: {t_avg}°C/{t_min}°C/{t_max}°C. "
        f"Humidity Avg/Min/Max: {h_avg}%/{h_min}%/{h_max}%. "
        f"Minimum Soil Moisture recorded: {soil_min}%. "
        f"Total Daily Rainfall (Accumulated): {total_rain}mm."
    )

async def ask_ai(prompt: str) -> str:
    payload = {
        "model": LLAMA_MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {
            "system": (
                "You are a highly concise Agronomist AI, specializing in real-time sensor data interpretation. "
                "You MUST use the provided context, including the FULL DAILY HISTORY ANALYSIS, to inform your answer. "
                "NO greetings, NO fillers, ONLY direct, professional agricultural advisory."
            )
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(LLAMA_API_URL, json=payload, timeout=45)
            r.raise_for_status()
            return r.json().get("response", "").strip()
    except Exception:
        return "**RECOMMENDATION:** AI engine offline.\n**REASONING:** Llama server unreachable."

# ==========================================
# API — ADVISORY
# ==========================================
@app.get("/api/agri-advisory")
async def get_advisory(district: str = Query(DEFAULT_DISTRICT)):
    """
    Returns advisory using the last 30 real readings for the model, and all historical data
    for the LLM context.
    Requires at least 30 timestamped entries in sensor_readings/.
    """
    try:
        
        hist_df, latest_entry, latest_ts, all_items = get_all_readings_and_prepare_model_input()
        season = get_season_context(_parse_iso_ts(latest_entry.get("Time_ISO", latest_ts)))

        model_res = get_model_resources(district)
        if model_res is None:
            
            raise HTTPException(status_code=500, detail="Model missing or failed to load. Check server console for file path error.")
        
        
        model_features_df = hist_df[FEATURE_COLS]
        
        
        scaled = model_res["scaler"].transform(model_features_df)

        final = np.expand_dims(scaled, axis=0) 

        
        prediction_probabilities = model_res["model"].predict(final, verbose=0)[0]
        
        predicted_class_index = int(np.argmax(prediction_probabilities))
    
        conf = float(round(prediction_probabilities[predicted_class_index] * 100, 2))

        
        RAIN_CATEGORIES = {
            0: "NO RAIN", 1: "VERY LIGHT RAIN LIKELY", 2: "LIGHT RAIN", 3: "MEDIUM RAIN", 4: "HEAVY RAIN"
        }
        
        forecast_category = RAIN_CATEGORIES.get(predicted_class_index, "UNKNOWN")

    
        t = float(latest_entry.get("Temp_DHT"))
        h = float(latest_entry.get("Hum_DHT"))
        p = float(latest_entry.get("Pressure_hPa"))
        soil = float(latest_entry.get("Soil_Moisture_Raw", 0.0))
        r = float(latest_entry.get("Rain", 0.0))

        
        if soil <= 5:
            forecast = "CRITICAL DROUGHT"
            action = "EMERGENCY IRRIGATION"
            reason = f"Soil moisture extremely low at {soil}%. Requires immediate action regardless of rain forecast."
        elif predicted_class_index >= 2: 
            forecast = forecast_category
            action = "STOP IRRIGATION" if soil > 40 else "DELAY IRRIGATION"
            reason = f"High confidence ({conf}%) of {forecast_category} detected."
        elif predicted_class_index == 1: 
            forecast = forecast_category
            action = "MONITOR SOIL"
            reason = f"Very Light Rain likely ({conf}%). Only sufficient if soil moisture is adequate."
        else: 
            forecast = "NO RAIN LIKELY"
            action = "START IRRIGATION" if soil < 40 else "NO ACTION REQUIRED"
            reason = f"Low rain probability ({conf}% confidence in NO RAIN). Soil moisture at {soil}%."
        
        
        daily_summary = get_daily_summary(all_items, latest_ts)
        
        prompt = f"""
        --- FULL DATA ANALYSIS CONTEXT ---
        Model Forecast (Predicted Category): {forecast} (Confidence: {conf}%)
        Model Type Used: {model_res.get('type', 'Unknown')}
        {daily_summary}
        ----------------------------------
        **RECOMMENDATION:** {action}
        **REASONING:** {reason}
        """

        ai_advice = await ask_ai(prompt)

        return {
            "timestamp": latest_entry.get("Time_ISO", latest_ts),
            "location": district,
            "season": season,
            "sensors": {
                "temperature": t,
                "humidity": h,
                "pressure": p,
                "soil_moisture": soil,
                "rain": r
            },
            "analysis": {
                "forecast": forecast,
                "confidence": conf,
                "action": action,
                "reason": reason
            },
            "llm_advisory": ai_advice
        }
    
    except HTTPException:
    
        raise
    except Exception as e:
        
        print("-" * 50)
        print("FATAL API CRASH INSIDE /api/agri-advisory:")
        import traceback
        traceback.print_exc(file=sys.stdout)
        print("-" * 50)
        raise HTTPException(status_code=500, detail=f"Internal server crash during advisory calculation: {e.__class__.__name__}: {e}")

# ==========================================
# API — CHAT (Updated to use hybrid model type)
# ==========================================
@app.post("/api/chat")
async def chat(req: ChatRequest):
    
    _, latest_entry, latest_ts, all_items = get_all_readings_and_prepare_model_input()
    season = get_season_context(_parse_iso_ts(latest_entry.get("Time_ISO", latest_ts)))

    daily_summary = get_daily_summary(all_items, latest_ts)

    try:
        t = float(latest_entry.get("Temp_DHT"))
        h = float(latest_entry.get("Hum_DHT"))
        p = float(latest_entry.get("Pressure_hPa"))
        soil = float(latest_entry.get("Soil_Moisture_Raw", 0.0))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid latest sensor numeric values: {e}")

    # --- REFINED CHAT PROMPT: Includes FULL DAILY HISTORY ANALYSIS ---
    prompt = f"""
    --- LIVE SENSOR DATA FOR {req.district.upper()} ---
    Current Season: {season}
    Temperature (Temp_DHT): {t}°C
    Relative Humidity (Hum_DHT): {h}%
    Surface Pressure (Pressure_hPa): {p} hPa
    Soil Moisture (Soil_Moisture_Raw): {soil}%
    
    --- DAILY HISTORY ANALYSIS ---
    {daily_summary}
    --------------------------------------------------

    You MUST analyze the LIVE SENSOR DATA and the DAILY HISTORY ANALYSIS above and provide a concise, immediate agricultural status report.
    
    1. Focus ONLY on the **current, immediate agricultural implication** of the sensor readings within the context of the {season} season and the daily history.
    2. Do NOT provide speculative forecasts (like "rain may occur").
    3. If the user's question is vague (like a greeting or a statement of facts), treat it as a request for the current Agricultural Status Report.
    4. Base your entire response on the current data and the season.
    
    User question: {req.message}
    """
    # --------------------------------------------------------------------------------

    reply = await ask_ai(prompt)

    return {"reply": reply}

if __name__ == "__main__":
    import uvicorn
    # Changed port back to 8000 to align with Uvicorn's default output and client request.
    uvicorn.run(app, host="0.0.0.0", port=8000)