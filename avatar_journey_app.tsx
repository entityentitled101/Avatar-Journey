import React, { useState } from 'react';
import { User, MapPin, BookOpen, Settings, Send } from 'lucide-react';

// =============== CONSTANTS ===============
const POPULAR_LOCATIONS = [
  '北京', '上海', '成都', '西安', '杭州', '南京', 
  '东京', '首尔', '曼谷', '新加坡', '巴黎', '伦敦',
  '纽约', '洛杉矶', '悉尼', '罗马'
];

const TRAVEL_METHODS = [
  { id: 'driving', name: '自驾游', desc: '开车自由行，灵活安排路线' },
  { id: 'walking', name: '徒步旅行', desc: '步行探索，深度体验当地' },
  { id: 'public', name: '公共交通', desc: '火车、巴士等公共交通' },
  { id: 'backpacking', name: '背包客', desc: '经济实惠的背包旅行' },
  { id: 'luxury', name: '豪华旅行', desc: '舒适享受的高端旅行' }
];

const TRAVEL_STYLES = [
  { id: 'adventure', name: '探险型', desc: '寻找刺激和新奇体验' },
  { id: 'leisure', name: '休闲型', desc: '放松身心，慢节奏游览' },
  { id: 'cultural', name: '文化体验型', desc: '深入了解当地文化历史' },
  { id: 'foodie', name: '美食寻访型', desc: '品尝各地特色美食' }
];

const NAVIGATION_ITEMS = [
  { id: 'setup', name: '角色设定', icon: User },
  { id: 'traveling', name: '旅行中', icon: MapPin },
  { id: 'diary', name: '旅行日记', icon: BookOpen },
  { id: 'settings', name: '设置', icon: Settings }
];

// =============== API SERVICE ===============
class APIService {
  constructor() {
    this.provider = 'CLAUDE';
    this.apiKey = '';
  }

  async callLLM(prompt, expectJSON = false) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.content[0].text;

      if (expectJSON) {
        responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(responseText);
      }

      return responseText;
    } catch (error) {
      console.error("API调用错误:", error);
      throw error;
    }
  }
}

const apiService = new APIService();

// =============== TRAVEL ENGINE ===============
class TravelEngine {
  constructor() {
    this.scheduledTimeouts = new Map();
  }

  async startJourney(character, updateState) {
    if (!character.name || !character.departureLocation || !character.destination) {
      throw new Error('请填写完整的角色信息和旅行配置');
    }

    const travelMethod = TRAVEL_METHODS.find(m => m.id === character.travelMethod);
    const travelStyle = TRAVEL_STYLES.find(s => s.id === character.travelStyle);
    
    const prompt = `
你是一个虚拟旅行游戏的AI助手，负责为用户的虚拟角色生成真实的旅行体验。

角色设定：
- 姓名：${character.name}
- 性格描述：${character.description}
- 出发地：${character.departureLocation}
- 目的地：${character.destination}
- 旅行方式：${travelMethod?.name}
- 旅行风格：${travelStyle?.name}

现在是${new Date().toLocaleString()}，角色刚开始这次旅行。请生成第一个旅行事件，并估算下次更新的时间。

请以JSON格式回复，包含以下字段：
{
  "currentLocation": "当前位置（详细地点）",
  "currentActivity": "当前正在做的事情",
  "eventDescription": "这次事件的详细描述（200字左右）",
  "nextEventTime": "下次事件预计发生的时间（小时后，如1.5表示1.5小时后）",
  "needsUserInput": false
}

要求：
1. 生成合理真实的旅行体验
2. 考虑旅行方式和从出发地到目的地的实际情况
3. 事件要有趣且符合角色设定
4. 时间估算要合理（通常0.5-3小时之间）
`;

    const result = await apiService.callLLM(prompt, true);
    
    const newEvent = {
      id: Date.now(),
      timestamp: new Date(),
      type: 'journey_start',
      content: result.eventDescription,
      needsUserInput: result.needsUserInput || false
    };

    updateState(prevState => ({
      ...prevState,
      events: [...prevState.events, newEvent],
      travelState: {
        isActive: true,
        currentLocation: result.currentLocation,
        currentActivity: result.currentActivity,
        lastUpdate: new Date(),
        nextEventTime: new Date(Date.now() + result.nextEventTime * 60 * 60 * 1000)
      }
    }));
    
    // 设置下次事件的定时器
    this.scheduleNextEvent(result.nextEventTime, character, updateState);
    
    return result;
  }

  scheduleNextEvent(hoursLater, character, updateState) {
    const delay = hoursLater * 60 * 60 * 1000;
    const timeoutId = setTimeout(() => {
      this.generateNextEvent(character, updateState);
    }, delay);
    
    this.scheduledTimeouts.set('nextEvent', timeoutId);
  }

  async generateNextEvent(character, updateState) {
    // 这里简化实现，在实际项目中需要访问当前状态
    console.log('生成下一个事件...');
  }

  async handleUserIntervention(userMessage, character, currentState, updateState) {
    const prompt = `
${character.name}正在旅行中。

当前状态：
- 位置：${currentState.travelState.currentLocation}
- 活动：${currentState.travelState.currentActivity}

用户发来消息想要干预角色的行动："${userMessage}"

请根据用户的建议，生成角色接下来的行动和遇到的情况。

请以JSON格式回复：
{
  "currentLocation": "位置（可能有变化）",
  "currentActivity": "根据用户建议调整的新活动",
  "eventDescription": "根据用户建议发生的新情况（200字左右）",
  "nextEventTime": "下次自动事件的时间（小时后）",
  "needsUserInput": false
}
`;

    const result = await apiService.callLLM(prompt, true);
    
    const newEvent = {
      id: Date.now(),
      timestamp: new Date(),
      type: 'user_intervention',
      content: result.eventDescription,
      needsUserInput: false,
      userMessage: userMessage
    };

    updateState(prevState => ({
      ...prevState,
      events: [...prevState.events, newEvent],
      travelState: {
        ...prevState.travelState,
        currentLocation: result.currentLocation,
        currentActivity: result.currentActivity,
        lastUpdate: new Date(),
        nextEventTime: new Date(Date.now() + result.nextEventTime * 60 * 60 * 1000)
      },
      userMessage: ''
    }));

    this.scheduleNextEvent(result.nextEventTime, character, updateState);
    return result;
  }

  clearAllTimeouts() {
    for (const [key, timeoutId] of this.scheduledTimeouts) {
      clearTimeout(timeoutId);
    }
    this.scheduledTimeouts.clear();
  }
}

const travelEngine = new TravelEngine();

// =============== COMPONENTS ===============
const Navigation = ({ currentPage, setCurrentPage }) => (
  <nav className="bg-white shadow-sm">
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex space-x-8">
        {NAVIGATION_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                currentPage === item.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  </nav>
);

const EventCard = ({ event }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <div className="flex justify-between items-start mb-2">
      <span className="text-sm text-gray-500">
        {new Date(event.timestamp).toLocaleString()}
      </span>
      {event.needsUserInput && (
        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
          等待选择
        </span>
      )}
    </div>
    
    {event.userMessage && (
      <div className="text-sm text-blue-600 mb-2">
        💬 你的指示: {event.userMessage}
      </div>
    )}
    
    <p className="text-gray-700">{event.content}</p>
  </div>
);

const MessageInput = ({ onSendMessage, isWaitingResponse, characterName }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim() || isWaitingResponse) return;
    onSendMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">与 {characterName} 对话</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="给角色发送建议或指示..."
          disabled={isWaitingResponse}
        />
        <button
          onClick={handleSend}
          disabled={isWaitingResponse || !message.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-500">
        你可以建议角色的下一步行动，比如"去当地市场看看"或"和那个人继续聊天"
      </p>
    </div>
  );
};

// =============== MAIN COMPONENT ===============
const AvatarJourney = () => {
  const [currentPage, setCurrentPage] = useState('setup');
  const [state, setState] = useState({
    character: {
      name: '',
      description: '',
      departureLocation: '',
      destination: '',
      travelMethod: '',
      travelStyle: ''
    },
    travelState: {
      isActive: false,
      currentLocation: '',
      currentActivity: '',
      lastUpdate: null,
      nextEventTime: null
    },
    events: [],
    diaries: [],
    userMessage: '',
    isWaitingResponse: false
  });

  // =============== PAGE COMPONENTS ===============
  const CharacterSetup = () => {
    const handleCharacterChange = (field, value) => {
      setState(prev => ({
        ...prev,
        character: { ...prev.character, [field]: value }
      }));
    };

    const handleStartJourney = async () => {
      setState(prev => ({ ...prev, isWaitingResponse: true }));
      try {
        await travelEngine.startJourney(state.character, setState);
        setCurrentPage('traveling');
      } catch (error) {
        alert(error.message);
      } finally {
        setState(prev => ({ ...prev, isWaitingResponse: false }));
      }
    };

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Avatar Journey</h1>
          <p className="text-gray-600">创建你的虚拟化身，开始一段奇妙的旅程</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-lg space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            角色设定
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色姓名</label>
            <input
              type="text"
              value={state.character.name}
              onChange={(e) => handleCharacterChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="给你的虚拟角色起个名字"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色描述</label>
            <textarea
              value={state.character.description}
              onChange={(e) => handleCharacterChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="描述角色的性格、兴趣爱好、背景等"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-lg space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            旅行配置
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出发地</label>
              <input
                type="text"
                value={state.character.departureLocation}
                onChange={(e) => handleCharacterChange('departureLocation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="选择出发城市"
                list="locations"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目的地</label>
              <input
                type="text"
                value={state.character.destination}
                onChange={(e) => handleCharacterChange('destination', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="选择目的地城市"
                list="locations"
              />
            </div>
          </div>

          <datalist id="locations">
            {POPULAR_LOCATIONS.map(location => (
              <option key={location} value={location} />
            ))}
          </datalist>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">旅行方式</label>
            <div className="grid grid-cols-1 gap-2">
              {TRAVEL_METHODS.map(method => (
                <label key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="travelMethod"
                    value={method.id}
                    checked={state.character.travelMethod === method.id}
                    onChange={(e) => handleCharacterChange('travelMethod', e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="font-medium">{method.name}</div>
                    <div className="text-sm text-gray-500">{method.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">旅行风格</label>
            <div className="grid grid-cols-2 gap-2">
              {TRAVEL_STYLES.map(style => (
                <label key={style.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="travelStyle"
                    value={style.id}
                    checked={state.character.travelStyle === style.id}
                    onChange={(e) => handleCharacterChange('travelStyle', e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-sm">{style.name}</div>
                    <div className="text-xs text-gray-500">{style.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartJourney}
            disabled={state.isWaitingResponse || !state.character.name || !state.character.departureLocation || !state.character.destination}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {state.isWaitingResponse ? '正在准备旅程...' : '开始旅程'}
          </button>
        </div>
      </div>
    );
  };

  const TravelingView = () => {
    const handleSendMessage = async (message) => {
      if (!message.trim() || state.isWaitingResponse) return;
      
      setState(prev => ({ ...prev, isWaitingResponse: true }));
      try {
        await travelEngine.handleUserIntervention(message, state.character, state, setState);
      } catch (error) {
        alert('发送消息时出错，请重试');
        console.error(error);
      } finally {
        setState(prev => ({ ...prev, isWaitingResponse: false }));
      }
    };

    if (!state.travelState.isActive) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center text-gray-500 py-12">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>还没有开始旅行</p>
            <p className="text-sm">请先设置角色信息并开始旅程</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            {state.character.name} 的旅程
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800">当前位置</h3>
              <p className="text-blue-600">{state.travelState.currentLocation}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800">正在进行</h3>
              <p className="text-green-600">{state.travelState.currentActivity}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-medium text-orange-800">最后更新</h3>
              <p className="text-orange-600">
                {state.travelState.lastUpdate ? new Date(state.travelState.lastUpdate).toLocaleString() : ''}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">旅行记录</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {state.events.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>旅行记录将在这里显示</p>
                </div>
              ) : (
                state.events.map(event => (
                  <EventCard key={event.id} event={event} />
                ))
              )}
            </div>
          </div>

          <div className="mt-6">
            <MessageInput 
              onSendMessage={handleSendMessage}
              isWaitingResponse={state.isWaitingResponse}
              characterName={state.character.name}
            />
          </div>
        </div>
      </div>
    );
  };

  const DiaryView = () => (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold flex items-center gap-2">
        <BookOpen className="w-6 h-6" />
        {state.character.name ? `${state.character.name} 的旅行日记` : '旅行日记'}
      </h2>
      
      {state.diaries.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>还没有日记记录</p>
          <p className="text-sm">开始旅行后会自动生成每日日记</p>
        </div>
      ) : (
        <div className="space-y-6">
          {state.diaries.map(diary => (
            <div key={diary.id} className="bg-white rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-2">{diary.date}</h3>
              <h4 className="text-md font-medium text-blue-600 mb-3">{diary.title}</h4>
              <p className="text-gray-700 leading-relaxed mb-4">{diary.content}</p>
              {diary.keyEvents && diary.keyEvents.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-600 mb-2">关键事件：</h5>
                  <ul className="text-sm text-gray-500 space-y-1">
                    {diary.keyEvents.map((event, index) => (
                      <li key={index}>• {event}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const SettingsView = () => {
    const handleResetAllData = () => {
      if (confirm('确定要重置所有数据吗？这将清除所有旅行记录和角色信息。')) {
        travelEngine.clearAllTimeouts();
        setState({
          character: {
            name: '',
            description: '',
            departureLocation: '',
            destination: '',
            travelMethod: '',
            travelStyle: ''
          },
          travelState: {
            isActive: false,
            currentLocation: '',
            currentActivity: '',
            lastUpdate: null,
            nextEventTime: null
          },
          events: [],
          diaries: [],
          userMessage: '',
          isWaitingResponse: false
        });
        setCurrentPage('setup');
        alert('所有数据已重置');
      }
    };

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          设置
        </h2>

        <div className="bg-white rounded-lg p-6 shadow-lg space-y-4">
          <h3 className="text-lg font-semibold">系统设置</h3>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 mb-2">数据管理</h4>
            <p className="text-xs text-red-700 mb-3">
              重置将清除所有角色信息、旅行记录和日记。此操作不可撤销。
            </p>
            <button
              onClick={handleResetAllData}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              重置所有数据
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">关于 Avatar Journey</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>版本: 1.0.0 (MVP)</p>
            <p>Avatar Journey 是一个基于 AI 的虚拟旅行游戏，让你的数字化身代替你去探索世界。</p>
            <p>通过智能对话系统，体验真实而有趣的旅行故事。</p>
            <p className="text-yellow-600 font-medium">注意：当前版本所有数据仅在浏览器会话中保存，刷新页面将丢失数据。</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="py-6">
        {currentPage === 'setup' && <CharacterSetup />}
        {currentPage === 'traveling' && <TravelingView />}
        {currentPage === 'diary' && <DiaryView />}
        {currentPage === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};

export default AvatarJourney;