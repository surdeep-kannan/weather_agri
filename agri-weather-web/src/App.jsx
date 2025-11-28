import { useState, useEffect, useRef } from 'react';
import { 
	CloudRain, Droplets, Thermometer, Gauge, Sprout, RefreshCw, WifiOff, 
	CheckCircle2, AlertTriangle, LayoutDashboard, MessageSquare, Menu, X, Send, User,
	Package, MapPin, Truck
} from 'lucide-react';

const API_URL = "http://10.237.95.187:8000/api/agri-advisory";
const CHAT_URL = "http://10.237.95.187:8000/api/chat";

// ===========================================
// PLACEHOLDER COMPONENTS (Integrated to fix compile error)
// ===========================================

function InventoryView() {
	return (
		<div className="p-6 bg-white rounded-xl shadow-lg h-full overflow-y-auto">
			<header className="content-header mb-6">
				<h1>Farm Inventory Management</h1>
				<p className="text-gray-500">Track and manage your agricultural resources.</p>
			</header>
			<div className="flex flex-col md:flex-row gap-6">
				<div className="md:w-1/2 bg-indigo-50 p-6 rounded-lg border border-indigo-200">
					<h3 className="text-xl font-semibold text-indigo-700 flex items-center mb-4"><Package className="mr-2" size={20} />Current Stock</h3>
					<ul className="space-y-3 text-gray-700">
						<li className="flex justify-between border-b pb-1"><span>Wheat Seeds:</span><span className="font-medium">120 kg</span></li>
						<li className="flex justify-between border-b pb-1"><span>Fertilizer (N-P-K):</span><span className="font-medium">50 bags</span></li>
						<li className="flex justify-between border-b pb-1"><span>Pesticides (Organic):</span><span className="font-medium">15 L</span></li>
						<li className="flex justify-between border-b pb-1"><span>Diesel:</span><span className="font-medium text-red-600">5 L (Low!)</span></li>
					</ul>
					<button className="mt-4 w-full bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition duration-200">Update Inventory</button>
				</div>
				<div className="md:w-1/2 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
					<h3 className="text-xl font-semibold text-yellow-700 flex items-center mb-4"><Truck className="mr-2" size={20} />Recent Movements</h3>
					<p className="text-sm text-gray-600">This feature is under development. It will track inputs and outputs automatically.</p>
					<div className="mt-4 p-3 bg-white rounded-md border border-gray-200 text-gray-800">
						<p className="text-sm">Last Entry: +20kg Wheat Seeds (2023-11-26)</p>
						<p className="text-sm">Last Exit: -1 Bag Fertilizer (2023-11-25)</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function SeedShopFinder() {
	const [location, setLocation] = useState('Chennai');
	
	const shops = [
		{ name: "Agri-Supply Hub", address: "123 Main Rd, T Nagar", rating: 4.5 },
		{ name: "Green Fields Seeds", address: "456 Market St, Velachery", rating: 4.8 },
		{ name: "Farmer's Friend Depot", address: "789 Bypass Rd, Tambaram", rating: 4.1 },
	];

	return (
		<div className="p-6 bg-white rounded-xl shadow-lg h-full overflow-y-auto">
			<header className="content-header mb-6">
				<h1>Seed & Supply Finder</h1>
				<p className="text-gray-500">Find the nearest recommended agricultural suppliers in {location}.</p>
			</header>
			
			<div className="mb-6 flex gap-4">
				<input
					type="text"
					value={location}
					onChange={(e) => setLocation(e.target.value)}
					placeholder="Enter your location/district"
					className="p-3 border border-gray-300 rounded-lg flex-grow focus:outline-none focus:ring-2 focus:ring-green-500"
				/>
				<button className="bg-green-600 text-white p-3 rounded-lg flex items-center hover:bg-green-700 transition duration-200">
					<MapPin size={20} className="mr-2" /> Search
				</button>
			</div>

			<div className="space-y-4">
				<h3 className="text-xl font-semibold text-gray-700">Recommended Suppliers</h3>
				{shops.map((shop, index) => (
					<div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
						<div>
							<p className="font-bold text-lg text-green-800">{shop.name}</p>
							<p className="text-sm text-gray-600">{shop.address}</p>
						</div>
						<div className="flex items-center space-x-2">
							<span className="text-yellow-500 text-xl">★</span>
							<span className="font-semibold text-gray-800">{shop.rating}</span>
						</div>
					</div>
				))}
			</div>
			
			<p className="mt-6 text-sm text-gray-500">Note: Results are based on proximity and farmer reviews. Availability must be confirmed with the shop.</p>
		</div>
	);
}

// ===========================================
// MAIN APP & SUB-COMPONENTS
// ===========================================

function App() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState('dashboard');	
	const [isSidebarOpen, setSidebarOpen] = useState(false);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(API_URL);
			if (!response.ok) throw new Error("Backend Offline");
			const json = await response.json();
			setData(json);
		} catch (err) {
			console.error(err);
			setError("Could not connect to Python Backend.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
		const interval = setInterval(fetchData, 30000);	
		return () => clearInterval(interval);
	}, []);

	const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

	if (loading && !data) return <div className="loading-container"><div className="spinner"></div><p>CONTACTING SATELLITE...</p></div>;
	if (error) return <div className="error-container"><WifiOff size={64} color="#ef4444" /><h2>Connection Lost</h2><p>{error}</p><button onClick={fetchData} className="retry-btn">RETRY</button></div>;

	return (
		<>
			<style>{css}</style>
			<div className="app-layout">
				<div className="mobile-header">
					<button onClick={toggleSidebar} className="menu-btn"><Menu /></button>
					<h1>Agri-AI</h1>
					<span className="badge location">{data.location}</span>
				</div>

				<aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
					<div className="sidebar-header">
						<h2>Agri-AI</h2>
						<button onClick={toggleSidebar} className="close-btn"><X /></button>
					</div>
					
					<nav className="nav-menu">
						<button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}>
							<LayoutDashboard size={20} /><span>Dashboard</span>
						</button>
						<button className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => { setActiveTab('chat'); setSidebarOpen(false); }}>
							<MessageSquare size={20} /><span>Agronomist Chat</span>
						</button>
						<button className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => { setActiveTab('inventory'); setSidebarOpen(false); }}>
							<Package size={20} /><span>Inventory</span>
						</button>
						<button className={`nav-item ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => { setActiveTab('shop'); setSidebarOpen(false); }}>
							<Sprout size={20} /><span>Shop Finder</span>
						</button>
					</nav>

					<div className="sidebar-footer">
						<p className="status-dot"><span className="dot-online"></span> System Online</p>
						<p className="timestamp">Updated: {data.timestamp.split(' ')[1]}</p>
					</div>
				</aside>

				<main className="main-content">
					<div className="content-view">
						{activeTab === 'dashboard' ? (
							<DashboardView data={data} refresh={fetchData} switchToChat={() => setActiveTab('chat')} />
						) : activeTab === 'chat' ? (
							<ChatView initialData={data} />
						) : activeTab === 'inventory' ? (
							<InventoryView />
						) : (
							<SeedShopFinder />
						)}
					</div>
				</main>
				
				{isSidebarOpen && <div className="overlay" onClick={toggleSidebar}></div>}
			</div>
		</>
	);
}

function DashboardView({ data, refresh, switchToChat }) {
	const isRain = data.analysis.forecast.includes('RAIN');
	const isStop = data.analysis.action.includes('STOP') || data.analysis.action.includes('DELAY') || data.analysis.action.includes('NO ACTION');

	return (
		<div className="dashboard-container">
			<header className="content-header">
				<div><h1>Farm Overview</h1><p className="subtitle">{data.season}</p></div>
				<button onClick={refresh} className="refresh-btn"><RefreshCw size={20} /></button>
			</header>

			<div className="dashboard-grid">
				<div className={`card verdict-card ${isRain ? 'rain-theme' : 'dry-theme'}`}>
					<p className="card-label">Physics Model Forecast</p>
					<h2>{data.analysis.forecast}</h2>
					<div className="confidence">{data.analysis.confidence}% Confidence</div>
				</div>

				<div className={`card action-card ${isStop ? 'safe-theme' : 'danger-theme'}`}>
					<div className="action-header">
						{isStop ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
						<p className="card-label">REQUIRED ACTION</p>
					</div>
					<h3>{data.analysis.action}</h3>
					<p className="reason">{data.analysis.reason}</p>
				</div>

				<div className="sensors-section">
					<h3 className="section-title">Live Sensors</h3>
					<div className="sensors-grid">
						<SensorCard label="Temp" value={data.sensors.temperature} unit="°C" icon={<Thermometer size={18} />} />
						<SensorCard label="Humidity" value={data.sensors.humidity} unit="%" icon={<Droplets size={18} />} color="#2563eb" />
						<SensorCard	
							label="Soil"	
							value={data.sensors.soil_moisture}	
							unit="%"	
							icon={<Sprout size={18} />}	
							color={data.sensors.soil_moisture < 40 ? "#dc2626" : "#16a34a"}	
						/>
						<SensorCard label="Pressure" value={data.sensors.pressure} unit="hPa" icon={<Gauge size={18} />} />
					</div>
				</div>

				<div className="card chat-teaser" onClick={switchToChat}>
					<div className="teaser-content">
						<div className="icon-box"><MessageSquare size={24} color="white" /></div>
						<div><h4>Ask the Agronomist</h4><p>Tap to chat about crops & weather</p></div>
					</div>
					<div className="arrow">→</div>
				</div>
			</div>
		</div>
	);
}

function ChatView({ initialData }) {
	const [messages, setMessages] = useState([
		{	
			id: 1,	
			sender: 'system',	
			text: `Hello! I am monitoring ${initialData.location}. Soil moisture is ${initialData.sensors.soil_moisture}%.`	
		},
		{	
			id: 2,	
			sender: 'ai',	
			text: initialData.llm_advisory.replace(/\\/g, '')	
		}
	]);
	const [inputText, setInputText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const chatBoxRef = useRef(null);

	useEffect(() => {
		if (chatBoxRef.current) {
			chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
		}
	}, [messages]);

	const sendMessage = async () => {
		if (!inputText.trim()) return;

		const userMsg = { id: Date.now(), sender: 'user', text: inputText };
		
		const historyForBackend = messages
			.filter(msg => msg.sender !== 'system')
			.map(msg => ({ sender: msg.sender, text: msg.text }));

		setMessages(prev => [...prev, userMsg]);
		setInputText("");
		setIsSending(true);

		try {
			// Note: The history is sent to the backend but the current Python implementation ignores it for chat context building.
			const response = await fetch(CHAT_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({	
					message: userMsg.text,
					district: initialData.location,
					history: historyForBackend
				})
			});
			
			const json = await response.json();
			
			if (!response.ok) {
				throw new Error(json.detail || "Server Error");
			}

			const replyText = json.reply && json.reply.trim() !== "" ? json.reply : "I'm having trouble analyzing that right now. Please try again.";
			
			const aiMsg = { id: Date.now() + 1, sender: 'ai', text: replyText };
			setMessages(prev => [...prev, aiMsg]);
			
		} catch (err) {
			console.error("Chat Error:", err);
			setMessages(prev => [...prev, { id: Date.now(), sender: 'system', text: `Error: ${err.message || "Could not reach Agronomist."}` }]);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="chat-container">
			<header className="content-header">
				<h1>Agronomist AI</h1>
			</header>

			<div className="chat-box" ref={chatBoxRef}>
				{messages.map((msg) => (
					<div key={msg.id} className={`message ${msg.sender}`}>
						<div className="avatar">
							{msg.sender === 'ai' ? '👨‍🌾' : msg.sender === 'user' ? <User size={20} /> : '🤖'}
						</div>
						<div className={`bubble ${msg.sender}-bubble`}>
							{msg.sender === 'ai' && <p className="bubble-header">AGRONOMIST</p>}
							<div className="advisory-text">{msg.text}</div>
						</div>
					</div>
				))}
				{isSending && (
					<div className="message ai">
						<div className="avatar">👨‍🌾</div>
						<div className="bubble ai-bubble">
							<div className="typing-indicator">Thinking...</div>
						</div>
					</div>
				)}
			</div>

			<div className="chat-input-area">
				<input	
					type="text"	
					placeholder="Ask about crops, irrigation, or pests..."	
					value={inputText}
					onChange={(e) => setInputText(e.target.value)}
					onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
					disabled={isSending}
				/>
				<button className="send-btn" onClick={sendMessage} disabled={isSending || !inputText.trim()}>
					<Send size={20} />
				</button>
			</div>
		</div>
	);
}

function SensorCard({ label, value, unit, icon, color = "#1e293b" }) {
	return (
		<div className="sensor-card">
			<div className="sensor-header"><span className="sensor-label">{label}</span>{icon}</div>
			<div className="sensor-value-box">
				<span className="sensor-value" style={{ color }}>{value}</span>
				<span className="sensor-unit">{unit}</span>
			</div>
		</div>
	);
}

// ===========================================
// STYLES (Integrated to fix compile error)
// ===========================================

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

body {
    margin: 0;
    font-family: 'Inter', sans-serif;
    background-color: #f4f7f9;
}

.app-layout {
    display: flex;
    min-height: 100vh;
    background-color: #f4f7f9;
}

/* SIDEBAR STYLES */
.sidebar {
    width: 280px;
    background-color: #1e293b; /* Dark Slate */
    color: white;
    display: flex;
    flex-direction: column;
    padding: 20px 0;
    box-shadow: 4px 0 10px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease-in-out;
    position: fixed;
    height: 100vh;
    z-index: 50;
    transform: translateX(0); /* Default desktop view */
}

.sidebar-header {
    padding: 0 20px 20px 20px;
    border-bottom: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sidebar-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    color: #a7f3d0; /* Light green accent */
}

.close-btn {
    display: none; /* Hide on desktop */
    background: none;
    border: none;
    color: white;
    cursor: pointer;
}

.nav-menu {
    flex-grow: 1;
    padding: 20px 0;
}

.nav-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 20px;
    background: none;
    border: none;
    color: #cbd5e1; /* Light gray text */
    text-align: left;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: background-color 0.2s, color 0.2s;
    border-left: 4px solid transparent;
}

.nav-item:hover {
    background-color: #334155;
    color: white;
}

.nav-item.active {
    background-color: #334155;
    color: #6ee7b7; /* Bright green accent */
    border-left: 4px solid #6ee7b7;
}

.nav-item span {
    margin-left: 10px;
}

.sidebar-footer {
    padding: 20px;
    border-top: 1px solid #334155;
    font-size: 0.85rem;
    color: #94a3b8;
}

.status-dot {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
}

.dot-online {
    height: 8px;
    width: 8px;
    background-color: #22c55e; /* Green */
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
}

/* MAIN CONTENT STYLES */
.main-content {
    flex-grow: 1;
    padding-left: 280px; /* Offset for desktop sidebar */
    padding: 20px;
    transition: padding-left 0.3s ease-in-out;
}

.content-view {
    max-width: 1200px;
    margin: 0 auto;
}

.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
}

.content-header h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #1e293b;
    margin: 0;
}

.subtitle {
    font-size: 1rem;
    color: #64748b;
    margin-top: 4px;
}

.refresh-btn {
    background-color: #475569;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
}

.refresh-btn:hover {
    background-color: #1e293b;
}

/* DASHBOARD GRID */
.dashboard-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(3, 1fr);
    grid-template-areas:
        "verdict action action"
        "sensors sensors chat"
        "sensors sensors chat";
}

.card {
    background-color: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.verdict-card {
    grid-area: verdict;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border: 1px solid;
}

.verdict-card h2 {
    font-size: 2.25rem;
    font-weight: 800;
    margin: 10px 0;
}

.card-label {
    text-transform: uppercase;
    font-size: 0.8rem;
    font-weight: 600;
    color: #64748b;
}

.confidence {
    font-size: 0.9rem;
    color: #94a3b8;
}

.rain-theme {
    border-color: #2563eb;
    background: #eff6ff;
}
.rain-theme h2 {
    color: #2563eb;
}

.dry-theme {
    border-color: #f97316;
    background: #fff7ed;
}
.dry-theme h2 {
    color: #f97316;
}

.action-card {
    grid-area: action;
    border-left: 4px solid;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.action-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.action-card h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 5px 0;
}

.safe-theme {
    border-color: #10b981;
}
.safe-theme h3 {
    color: #10b981;
}
.safe-theme .action-header svg {
    color: #10b981;
}

.danger-theme {
    border-color: #ef4444;
}
.danger-theme h3 {
    color: #ef4444;
}
.danger-theme .action-header svg {
    color: #ef4444;
}

.reason {
    font-size: 0.95rem;
    color: #64748b;
}

.sensors-section {
    grid-area: sensors;
    background-color: #ffffff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.section-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 15px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
}

.sensors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 15px;
}

.sensor-card {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 15px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.sensor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #64748b;
    margin-bottom: 10px;
}

.sensor-label {
    font-size: 0.9rem;
    font-weight: 600;
}

.sensor-value-box {
    display: flex;
    align-items: baseline;
}

.sensor-value {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
    margin-right: 5px;
    transition: color 0.3s;
}

.sensor-unit {
    font-size: 1rem;
    color: #64748b;
    font-weight: 600;
}

.chat-teaser {
    grid-area: chat;
    background-color: #0d9488; /* Teal */
    color: white;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: transform 0.2s, box-shadow 0.2s;
}

.chat-teaser:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 10px rgba(13, 148, 136, 0.3);
}

.teaser-content {
    display: flex;
    align-items: center;
}

.icon-box {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 10px;
    border-radius: 8px;
    margin-right: 15px;
}

.chat-teaser h4 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
}

.chat-teaser p {
    margin: 2px 0 0 0;
    font-size: 0.9rem;
    color: #e0f2f1;
}

.arrow {
    font-size: 2rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.7);
}


/* CHAT VIEW STYLES */
.chat-container {
    display: flex;
    flex-direction: column;
    height: 90vh;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.chat-box {
    flex-grow: 1;
    overflow-y: auto;
    padding: 20px;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

.message {
    display: flex;
    margin-bottom: 15px;
    align-items: flex-start;
}

.message.user {
    justify-content: flex-end;
}

.message.ai, .message.system {
    justify-content: flex-start;
}

.avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: #94a3b8;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2rem;
    flex-shrink: 0;
    margin-right: 10px;
}

.message.user .avatar {
    order: 2;
    margin-left: 10px;
    margin-right: 0;
    background-color: #3b82f6;
}

.bubble {
    max-width: 75%;
    padding: 12px 16px;
    border-radius: 18px;
    line-height: 1.4;
    font-size: 0.95rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.bubble-header {
    font-weight: 700;
    font-size: 0.8rem;
    margin-bottom: 5px;
    color: #4b5563;
    text-transform: uppercase;
}

.ai-bubble {
    background-color: #e0f2f1; /* Light Teal */
    color: #0f766e;
    border-top-left-radius: 2px;
}

.user-bubble {
    background-color: #3b82f6; /* Blue */
    color: white;
    order: 1;
    border-top-right-radius: 2px;
}

.system-bubble {
    background-color: #fef3c7; /* Light Yellow */
    color: #92400e;
    border-top-left-radius: 2px;
}

.typing-indicator {
    color: #4b5563;
    font-style: italic;
}

.chat-input-area {
    display: flex;
    padding: 15px 20px;
    border-top: 1px solid #e2e8f0;
    background-color: white;
}

.chat-input-area input {
    flex-grow: 1;
    padding: 10px 15px;
    border: 1px solid #cbd5e1;
    border-radius: 25px;
    margin-right: 10px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input-area input:focus {
    border-color: #0d9488;
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.2);
}

.send-btn {
    background-color: #0d9488;
    color: white;
    border: none;
    border-radius: 50%;
    width: 45px;
    height: 45px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s;
    flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
    background-color: #0f766e;
}

.send-btn:disabled {
    background-color: #99f6e4;
    cursor: not-allowed;
}


/* LOADING & ERROR STYLES */
.loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
    background-color: #f4f7f9;
}

.loading-container p, .error-container p {
    color: #64748b;
}

.spinner {
    border: 8px solid #f3f3f3;
    border-top: 8px solid #0d9488;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.retry-btn {
    background-color: #ef4444;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    margin-top: 20px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s;
}

.retry-btn:hover {
    background-color: #dc2626;
}

/* MOBILE STYLES */
.mobile-header {
    display: none; /* Hide on desktop */
}

.badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
    background-color: #99f6e4;
    color: #0d9488;
}


@media (max-width: 1024px) {
    .sidebar {
        transform: translateX(-100%);
        box-shadow: none;
    }
    
    .sidebar.open {
        transform: translateX(0%);
        box-shadow: 4px 0 10px rgba(0, 0, 0, 0.2);
    }

    .close-btn {
        display: block;
    }

    .main-content {
        padding-left: 0;
        padding-top: 60px; /* Space for fixed mobile header */
    }
    
    .dashboard-container {
        padding: 0 10px;
    }

    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 40;
    }

    .mobile-header {
        display: flex;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        align-items: center;
        justify-content: space-between;
        padding: 10px 15px;
        background-color: #1e293b;
        color: white;
        z-index: 30;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .mobile-header h1 {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
    }
    
    .menu-btn {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
    }

    /* Dashboard adjustments for smaller screens */
    .dashboard-grid {
        grid-template-columns: 1fr;
        grid-template-areas:
            "verdict"
            "action"
            "sensors"
            "chat";
    }
    
    .chat-container {
        height: 75vh;
    }
}

`;

export default App;