import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Platform,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const AdminPanelScreen = () => {
  const navigation = useNavigation();
  const [token, setToken] = useState(null);
  const [groups, setGroups] = useState([]);
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('groups'); // 'groups', 'chats', 'users', 'posts', 'server'
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [selectedUserForBan, setSelectedUserForBan] = useState(null);
  
  // Состояние сервера
  const [serverStatus, setServerStatus] = useState('checking');
  const [serverLogs, setServerLogs] = useState([]);
  const [serverStats, setServerStats] = useState({
    uptime: 0,
    activeUsers: 0,
    activeGroups: 0,
    totalMessages: 0,
    memory: 'N/A',
  });
  const [logAutoRefresh, setLogAutoRefresh] = useState(true);

  // Создание axios instance с токеном
  const createApiClient = async (authToken) => {
    return axios.create({
      baseURL: 'http://151.241.228.247:3001/api',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });
  };

  // Проверка статуса сервера
  const checkServerStatus = async (authToken) => {
    try {
      const client = await createApiClient(authToken);
      const response = await client.get('/server/status');
      setServerStatus('online');
      setServerStats(response.data || {});
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
      setServerStatus('offline');
    }
  };

  // Получение логов сервера
  const fetchServerLogs = async (authToken) => {
    try {
      const client = await createApiClient(authToken);
      const response = await client.get('/admin/server/logs');
      setServerLogs(response.data?.logs || []);
    } catch (error) {
      console.error('Ошибка получения логов:', error);
    }
  };

  // Перезагрузка сервера
  const restartServer = async (authToken) => {
    Alert.alert(
      '⚠️ Перезагрузка сервера',
      'Это приведет к временному отключению сервиса. Продолжить?',
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Перезагрузить',
          onPress: async () => {
            try {
              const client = await createApiClient(authToken);
              await client.post('/admin/server/restart');
              Alert.alert('✅ Успешно', 'Сервер перезагружается...');
              
              // Проверяем статус через 3 сек
              setTimeout(() => {
                checkServerStatus(authToken);
              }, 3000);
            } catch (error) {
              console.error('Ошибка перезагрузки:', error);
              Alert.alert('❌ Ошибка', 'Не удалось перезагрузить сервер');
            }
          },
        },
      ]
    );
  };

  // Загрузка групп
  const fetchGroups = async (authToken) => {
    try {
      const client = await createApiClient(authToken);
      const response = await client.get('/admin/groups');
      setGroups(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить группы');
    }
  };

  // Загрузка чатов
  const fetchChats = async (authToken) => {
    try {
      const client = await createApiClient(authToken);
      const response = await client.get('/admin/chats');
      setChats(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить чаты');
    }
  };

  const fetchUsers = async (authToken) => {
    try {
      const client = await createApiClient(authToken);
      const response = await client.get('/users');
      const usersData = response.data || [];
      
      const usersWithBanStatus = await Promise.all(
        usersData.map(async (user) => {
          if (user.is_banned !== undefined) {
            return user;
          }
          try {
            const banInfoResponse = await client.get(`/admin/users/${user.id}/ban-info`);
            return {
              ...user,
              is_banned: banInfoResponse.data.data?.is_banned || false,
              ban_reason: banInfoResponse.data.data?.ban_reason,
              banned_at: banInfoResponse.data.data?.banned_at
            };
          } catch (error) {
            return { ...user, is_banned: false };
          }
        })
      );
      
      setUsers(usersWithBanStatus);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить пользователей');
    }
  };

  const fetchPosts = async (authToken) => {
    try {
      const client = await createApiClient(authToken);
      const response = await client.get('/posts');
      setPosts(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить посты');
    }
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('authToken');
        if (savedToken) {
          setToken(savedToken);
          await checkServerStatus(savedToken);
          await fetchServerLogs(savedToken);
          await fetchGroups(savedToken);
          await fetchChats(savedToken);
          await fetchUsers(savedToken);
          await fetchPosts(savedToken);
        } else {
          Alert.alert('Ошибка', 'Токен не найден');
          navigation.navigate('Login');
        }
      } catch (error) {
        console.error('Ошибка инициализации:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Автоматическое обновление логов
  useEffect(() => {
    if (!logAutoRefresh || activeTab !== 'server' || !token) return;
    
    const interval = setInterval(() => {
      fetchServerLogs(token);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [logAutoRefresh, activeTab, token]);

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (token) {
        if (activeTab === 'groups') {
          await fetchGroups(token);
        } else if (activeTab === 'chats') {
          await fetchChats(token);
        } else if (activeTab === 'users') {
          await fetchUsers(token);
        } else if (activeTab === 'posts') {
          await fetchPosts(token);
        } else if (activeTab === 'server') {
          await checkServerStatus(token);
          await fetchServerLogs(token);
        }
      }
    } catch (error) {
      console.error('Ошибка обновления:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Удаление группы
  const deleteGroup = async (groupId) => {
    Alert.alert(
      'Удаление группы',
      'Вы уверены? Это действие необратимо.',
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Удалить',
          onPress: async () => {
            try {
              const client = await createApiClient(token);
              await client.delete(`/admin/groups/${groupId}`);
              Alert.alert('Успешно', 'Группа удалена');
              await fetchGroups(token);
            } catch (error) {
              console.error('Ошибка удаления группы:', error);
              Alert.alert('Ошибка', 'Не удалось удалить группу');
            }
          },
        },
      ]
    );
  };

  // Бан пользователя
  const banUser = async (userId) => {
    setSelectedUserForBan(userId);
    setBanReason('Нарушение правил сообщества');
    setBanModalVisible(true);
  };

  // Подтверждение бана с причиной
  const confirmBan = async () => {
    if (!banReason.trim()) {
      Alert.alert('Ошибка', 'Укажите причину бана');
      return;
    }

    try {
      const client = await createApiClient(token);
      await client.post(`/admin/users/${selectedUserForBan}/ban`, { 
        reason: banReason.trim()
      });
      console.log(`✅ Пользователь ${selectedUserForBan} забанен. Причина: ${banReason}`);
      Alert.alert('Успешно', 'Пользователь забанен');
      setBanModalVisible(false);
      setBanReason('');
      setSelectedUserForBan(null);
      await fetchUsers(token);
    } catch (error) {
      console.error('Ошибка при бане:', error);
      Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось забанить пользователя');
    }
  };

  // Разбан пользователя
  const unbanUser = async (userId, username) => {
    Alert.alert(
      'Разбанить пользователя',
      `Разбанить пользователя ${username}?`,
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Разбанить',
          onPress: async () => {
            try {
              const client = await createApiClient(token);
              await client.post(`/admin/users/${userId}/unban`);
              console.log(`✅ Пользователь ${userId} разбанен`);
              Alert.alert('Успешно', 'Пользователь разбанен');
              await fetchUsers(token);
            } catch (error) {
              console.error('Ошибка при разбане:', error);
              Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось разбанить пользователя');
            }
          },
        },
      ]
    );
  };

  // Удаление пользователя
  const deleteUser = async (userId, username) => {
    Alert.alert(
      'Удаление пользователя',
      `Вы уверены, что хотите удалить пользователя ${username}?\nЭто действие необратимо.`,
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Удалить',
          onPress: async () => {
            try {
              const client = await createApiClient(token);
              await client.delete(`/admin/users/${userId}`);
              Alert.alert('Успешно', 'Пользователь удалён');
              await fetchUsers(token);
            } catch (error) {
              console.error('Ошибка удаления пользователя:', error);
              Alert.alert('Ошибка', 'Не удалось удалить пользователя');
            }
          },
        },
      ]
    );
  };

  // Удаление поста
  const deletePost = async (postId, author) => {
    Alert.alert(
      'Удаление поста',
      `Вы уверены, что хотите удалить пост от ${author}?\nЭто действие необратимо.`,
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Удалить',
          onPress: async () => {
            try {
              const client = await createApiClient(token);
              await client.delete(`/admin/posts/${postId}`);
              Alert.alert('Успешно', 'Пост удалён');
              await fetchPosts(token);
            } catch (error) {
              console.error('Ошибка удаления поста:', error);
              Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось удалить пост');
            }
          },
        },
      ]
    );
  };

  // Удаление чата
  const deleteChat = async (user1Id, user2Id) => {
    Alert.alert(
      'Удаление чата',
      'Вы уверены? Это действие необратимо.',
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Удалить',
          onPress: async () => {
            try {
              const client = await createApiClient(token);
              await client.delete(`/admin/chats/${user1Id}/${user2Id}`);
              Alert.alert('Успешно', 'Чат удалён');
              await fetchChats(token);
            } catch (error) {
              console.error('Ошибка удаления чата:', error);
              Alert.alert('Ошибка', 'Не удалось удалить чат');
            }
          },
        },
      ]
    );
  };

  // Выход
  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены?',
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Выйти',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('user');
              navigation.navigate('Login');
            } catch (error) {
              console.error('Ошибка выхода:', error);
            }
          },
        },
      ]
    );
  };

  // Рендер элемента группы
  const renderGroupItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemIcon}>
        <Ionicons name="people" size={24} color="#6366F1" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <View style={styles.itemMetaRow}>
          <Ionicons name="person" size={12} color="#999" />
          <Text style={styles.itemMeta}>
            {item.creator_name || 'Неизвестно'}
          </Text>
        </View>
        <View style={styles.itemMetaRow}>
          <Ionicons name="people" size={12} color="#999" />
          <Text style={styles.itemMeta}>
            {item.member_count || 0} участников
          </Text>
        </View>
        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteGroup(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Рендер элемента чата
  const renderChatItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemIcon}>
        <Ionicons name="chatbubbles" size={24} color="#6366F1" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>
          {item.user1?.username} ↔ {item.user2?.username}
        </Text>
        <View style={styles.itemMetaRow}>
          <Ionicons name="chatbox-ellipses" size={12} color="#999" />
          <Text style={styles.itemMeta}>
            {item.message_count} сообщений
          </Text>
        </View>
        <View style={styles.itemMetaRow}>
          <Ionicons name="time" size={12} color="#999" />
          <Text style={styles.itemMeta}>
            {new Date(item.last_message_time).toLocaleString('ru-RU')}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteChat(item.user1?.id, item.user2?.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Рендер элемента пользователя
  const renderUserItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemIcon}>
        <Ionicons name="person" size={24} color="#6366F1" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.username}</Text>
        <View style={styles.itemMetaRow}>
          <Ionicons name="mail" size={12} color="#999" />
          <Text style={styles.itemMeta}>{item.email}</Text>
        </View>
        <View style={styles.itemMetaRow}>
          <Ionicons name="calendar" size={12} color="#999" />
          <Text style={styles.itemMeta}>
            {new Date(item.created_at).toLocaleDateString('ru-RU')}
          </Text>
        </View>
        {item.is_banned && (
          <View style={styles.bannedBadge}>
            <Text style={styles.bannedText}>ЗАБАНЕН</Text>
          </View>
        )}
      </View>
      {item.is_banned ? (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: '#22c55e', marginRight: 8 }]}
          onPress={() => unbanUser(item.id, item.username)}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.deleteButton, { marginRight: 8 }]}
          onPress={() => banUser(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="ban" size={18} color="#fff" />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteUser(item.id, item.username)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Рендер элемента поста
  const renderPostItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemIcon}>
        <Ionicons name="document-text" size={24} color="#6366F1" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.content || 'Без текста'}
        </Text>
        <View style={styles.itemMetaRow}>
          <Ionicons name="person" size={12} color="#999" />
          <Text style={styles.itemMeta}>
            {item.user?.username || 'Неизвестно'}
          </Text>
        </View>
        <View style={styles.itemMetaRow}>
          <Ionicons name="heart" size={12} color="#999" />
          <Text style={styles.itemMeta}>
            {item.likes_count || 0} лайков
          </Text>
        </View>
        <View style={styles.itemMetaRow}>
          <Ionicons name="chatbubbles" size={12} color="#999" />
          <Text style={styles.itemMeta}>
            {item.comments_count || 0} комментариев
          </Text>
        </View>
        <View style={styles.itemMetaRow}>
          <Ionicons name="calendar" size={12} color="#999" />
          <Text style={styles.itemMeta}>
            {new Date(item.created_at).toLocaleString('ru-RU')}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deletePost(item.id, item.user?.username || 'Неизвестно')}
        activeOpacity={0.7}
      >
        <Ionicons name="trash" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Рендер логов сервера
  const renderLogItem = ({ item, index }) => (
    <View style={styles.logItem}>
      <View style={[
        styles.logIndicator,
        { 
          backgroundColor: item.level === 'error' ? '#ef4444' : 
                          item.level === 'warning' ? '#f59e0b' :
                          item.level === 'success' ? '#22c55e' : '#3b82f6'
        }
      ]} />
      <View style={styles.logContent}>
        <Text style={styles.logText}>{item.message}</Text>
        <Text style={styles.logTime}>
          {new Date(item.timestamp).toLocaleTimeString('ru-RU')}
        </Text>
      </View>
    </View>
  );

  // Рендер статуса сервера
  const renderServerStatus = () => (
    <ScrollView 
      style={styles.list}
      contentContainerStyle={styles.serverContent}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor="#6366F1"
        />
      }
    >
      {/* Статус блок */}
      <View style={[
        styles.statusCard,
        { backgroundColor: serverStatus === 'online' ? '#dcfce7' : '#fee2e2' }
      ]}>
        <View style={styles.statusHeader}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: serverStatus === 'online' ? '#22c55e' : '#ef4444' }
          ]} />
          <Text style={[
            styles.statusTitle,
            { color: serverStatus === 'online' ? '#15803d' : '#7f1d1d' }
          ]}>
            {serverStatus === 'online' ? '🟢 Сервер онлайн' : '🔴 Сервер оффлайн'}
          </Text>
        </View>
        <Text style={[
          styles.statusSubtitle,
          { color: serverStatus === 'online' ? '#16a34a' : '#991b1b' }
        ]}>
          {serverStatus === 'online' ? 'Все системы работают нормально' : 'Нет подключения к серверу'}
        </Text>
      </View>

      {/* Статистика */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="timer" size={24} color="#6366F1" />
          <Text style={styles.statValue}>{serverStats.uptime || '0'}s</Text>
          <Text style={styles.statLabel}>Время работы</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#6366F1" />
          <Text style={styles.statValue}>{serverStats.activeUsers || 0}</Text>
          <Text style={styles.statLabel}>Активных пользователей</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="chatbubbles" size={24} color="#6366F1" />
          <Text style={styles.statValue}>{serverStats.totalMessages || 0}</Text>
          <Text style={styles.statLabel}>Всего сообщений</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="hardware-chip" size={24} color="#6366F1" />
          <Text style={styles.statValue}>{serverStats.memory || 'N/A'}</Text>
          <Text style={styles.statLabel}>Память</Text>
        </View>
      </View>

      {/* Кнопка перезагрузки */}
      <TouchableOpacity 
        style={styles.restartButton}
        onPress={() => restartServer(token)}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.restartButtonText}>Перезагрузить сервер</Text>
      </TouchableOpacity>

      {/* Переключатель автообновления логов */}
      <View style={styles.autoRefreshContainer}>
        <View style={styles.autoRefreshContent}>
          <Ionicons name="sync" size={18} color="#6366F1" />
          <Text style={styles.autoRefreshLabel}>Автообновление логов</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.toggleButton,
            { backgroundColor: logAutoRefresh ? '#22c55e' : '#cbd5e1' }
          ]}
          onPress={() => setLogAutoRefresh(!logAutoRefresh)}
          activeOpacity={0.8}
        >
          <View style={[
            styles.toggleCircle,
            { transform: [{ translateX: logAutoRefresh ? 20 : 0 }] }
          ]} />
        </TouchableOpacity>
      </View>

      {/* Логи */}
      <View style={styles.logsHeader}>
        <Ionicons name="document-text" size={20} color="#1e293b" />
        <Text style={styles.logsTitle}>Логи сервера (последние 50)</Text>
      </View>
      
      {serverLogs.length > 0 ? (
        <View style={styles.logsList}>
          {serverLogs.slice(-50).reverse().map((log, index) => (
            <View key={index} style={styles.logItem}>
              <View style={[
                styles.logIndicator,
                { 
                  backgroundColor: log.level === 'error' ? '#ef4444' : 
                                  log.level === 'warning' ? '#f59e0b' :
                                  log.level === 'success' ? '#22c55e' : '#3b82f6'
                }
              ]} />
              <View style={styles.logContent}>
                <Text style={styles.logText} numberOfLines={2}>{log.message}</Text>
                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString('ru-RU')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyLogsContainer}>
          <Ionicons name="document-outline" size={48} color="#ddd" />
          <Text style={styles.emptyLogsText}>Нет логов</Text>
        </View>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Красивая шапка с градиентом */}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="shield" size={32} color="#fff" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Admin Panel</Text>
              <Text style={styles.headerSubtitle}>Управление системой</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Вкладки */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'server' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('server')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="server" 
            size={18} 
            color={activeTab === 'server' ? '#6366F1' : '#999'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'server' && styles.activeTabText,
            ]}
          >
            Сервер
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'groups' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('groups')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="people" 
            size={18} 
            color={activeTab === 'groups' ? '#6366F1' : '#999'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'groups' && styles.activeTabText,
            ]}
          >
            Группы
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'chats' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('chats')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="chatbubbles" 
            size={18} 
            color={activeTab === 'chats' ? '#6366F1' : '#999'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'chats' && styles.activeTabText,
            ]}
          >
            Чаты
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'users' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="person" 
            size={18} 
            color={activeTab === 'users' ? '#6366F1' : '#999'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'users' && styles.activeTabText,
            ]}
          >
            Люди
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'posts' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('posts')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="document-text" 
            size={18} 
            color={activeTab === 'posts' ? '#6366F1' : '#999'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'posts' && styles.activeTabText,
            ]}
          >
            Посты
          </Text>
        </TouchableOpacity>
      </View>

      {/* Контент */}
      {activeTab === 'server' ? (
        renderServerStatus()
      ) : activeTab === 'groups' ? (
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#6366F1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="layers-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>Нет групп</Text>
            </View>
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : activeTab === 'chats' ? (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item, index) => `${item.user1?.id}-${item.user2?.id}-${index}`}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#6366F1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>Нет чатов</Text>
            </View>
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : activeTab === 'users' ? (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#6366F1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>Нет пользователей</Text>
            </View>
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#6366F1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>Нет постов</Text>
            </View>
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      {/* Модальное окно для выбора причины бана */}
      <Modal
        visible={banModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚫 Причина бана</Text>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Укажите причину блокировки пользователя
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Напишите причину бана..."
              placeholderTextColor="#999"
              value={banReason}
              onChangeText={setBanReason}
              multiline={true}
              numberOfLines={4}
            />
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setBanModalVisible(false);
                  setBanReason('');
                  setSelectedUserForBan(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmBan}
              >
                <Text style={styles.confirmButtonText}>Забанить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeArea: {
    backgroundColor: '#1e293b',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: '#6366F1',
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  serverContent: {
    padding: 12,
    paddingBottom: 20,
  },
  statusCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusSubtitle: {
    fontSize: 14,
    marginLeft: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6366F1',
    marginVertical: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  restartButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  autoRefreshContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  autoRefreshContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  autoRefreshLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  toggleButton: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  logsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 10,
  },
  logContent: {
    flex: 1,
  },
  logText: {
    fontSize: 13,
    color: '#1e293b',
    marginBottom: 2,
  },
  logTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyLogsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyLogsText: {
    fontSize: 16,
    color: '#cbd5e1',
    marginTop: 12,
    fontWeight: '500',
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  itemDescription: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    fontStyle: 'italic',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#cbd5e1',
    marginTop: 12,
    fontWeight: '500',
  },
  bannedBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  bannedText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 20,
    textAlignVertical: 'top',
    backgroundColor: '#f8f9fa',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AdminPanelScreen;
