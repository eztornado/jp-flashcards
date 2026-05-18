import React, { useEffect, useState, useRef } from 'react'
import {
  AppShell,
  Button,
  Card,
  Center,
  Group,
  Stack,
  Text,
  Title,
  TextInput,
  ScrollArea,
  Badge,
  ActionIcon,
  Menu,
  Modal,
  Select,
  Loader,
  Paper,
  Box,
  Divider,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconSend,
  IconVolume,
  IconLanguage,
  IconMessageCircle,
  IconPlus,
  IconTrash,
  IconChevronLeft,
  IconDotsVertical,
  IconRobot,
  IconUser,
  IconX,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'

type ChatSession = {
  id: number
  topic: string
  created_at: string
  updated_at: string
  message_count?: number
}

type ChatMessage = {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

const CHAT_TOPICS = [
  { value: 'general', label: '💬 Chat General' },
  { value: 'daily', label: '☕ Conversación Diaria' },
  { value: 'food', label: '🍜 Comida y Bebida' },
  { value: 'travel', label: '✈️ Viajes' },
  { value: 'shopping', label: '🛍️ Compras' },
  { value: 'music', label: '🎵 Música y Entretenimiento' },
  { value: 'study', label: '📚 Estudio' },
]

export default function Chat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState<'ja' | 'es'>('ja')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState('general')
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // TTS Setup
  const [speechReady, setSpeechReady] = useState(false)
  const [jaVoice, setJaVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [esVoice, setEsVoice] = useState<SpeechSynthesisVoice | null>(null)

  const pickVoices = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const voices = window.speechSynthesis.getVoices()
    const ja = voices.find(v => (v.lang || '').toLowerCase().startsWith('ja')) || null
    const es = voices.find(v => (v.lang || '').toLowerCase().startsWith('es')) || null
    setJaVoice(ja)
    setEsVoice(es)
    setSpeechReady(true)
  }

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    pickVoices()
    window.speechSynthesis.onvoiceschanged = pickVoices
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('.mantine-ScrollArea-viewport')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  const loadSessions = async () => {
    try {
      const res = await fetch('http://rpi4.netbird.vpn:3000/api/chat/sessions')
      const data = await res.json()
      setSessions(data)
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const createNewSession = async () => {
    const topicLabel = CHAT_TOPICS.find(t => t.value === selectedTopic)?.label || 'Chat General'
    try {
      const res = await fetch('http://rpi4.netbird.vpn:3000/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicLabel })
      })
      const newSession = await res.json()
      setSessions([newSession, ...sessions])
      setCurrentSession(newSession)
      setMessages([])
      setShowNewChatModal(false)
      notifications.show({
        color: 'teal',
        title: 'Nueva conversación',
        message: `Iniciada: ${topicLabel}`
      })
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Error',
        message: 'No se pudo crear la sesión'
      })
    }
  }

  const loadMessages = async (sessionId: number) => {
    try {
      const res = await fetch(`http://rpi4.netbird.vpn:3000/api/chat/sessions/${sessionId}/messages`)
      const data = await res.json()
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session)
    loadMessages(session.id)
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || loading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setLoading(true)

    // Add user message to UI immediately
    const tempUserMessage: ChatMessage = {
      id: Date.now(),
      session_id: currentSession.id,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      const res = await fetch(`http://rpi4.netbird.vpn:3000/api/chat/sessions/${currentSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          language 
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error sending message')
      }

      const assistantMessage = await res.json()
      setMessages(prev => [...prev.filter(m => m.id !== tempUserMessage.id), assistantMessage])
      
      // Auto-play TTS for assistant response if in Japanese mode
      if (language === 'ja' && speechReady) {
        speak(assistantMessage.content, 'ja')
      }
    } catch (error: any) {
      notifications.show({
        color: 'red',
        title: 'Error',
        message: error.message || 'No se pudo enviar el mensaje'
      })
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
    } finally {
      setLoading(false)
    }
  }

  const deleteSession = async (sessionId: number) => {
    if (!confirm('¿Eliminar esta conversación?')) return
    
    try {
      const res = await fetch(`http://rpi4.netbird.vpn:3000/api/chat/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId))
        if (currentSession?.id === sessionId) {
          setCurrentSession(null)
          setMessages([])
        }
        notifications.show({
          color: 'teal',
          title: 'Eliminada',
          message: 'Conversación eliminada'
        })
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Error',
        message: 'No se pudo eliminar la conversación'
      })
    }
  }

  const speak = (text: string, lang: 'ja' | 'es') => {
    if (!('speechSynthesis' in window)) return
    
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'ja' ? 'ja-JP' : 'es-ES'
    if (lang === 'ja' && jaVoice) u.voice = jaVoice
    if (lang === 'es' && esVoice) u.voice = esVoice
    u.rate = 0.9
    u.pitch = 1.0
    u.volume = 1.0
    
    window.speechSynthesis.speak(u)
  }

  const translateMessage = async (content: string, targetLang: 'ja' | 'es') => {
    // This would ideally call a translation API
    // For now, we'll just show a notification
    notifications.show({
      color: 'blue',
      title: 'Traducción',
      message: 'Función de traducción próximamente disponible'
    })
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ 
        width: { base: 250, sm: 300 }, 
        breakpoint: 'sm',
        collapsed: { mobile: !currentSession }
      }}
    >
      <AppShell.Header>
        <Group px="md" h="100%" align="center" justify="space-between">
          <Group gap="xs">
            <ActionIcon variant="subtle" component={Link} to="/">
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Title order={5}>Chat</Title>
          </Group>
          <Group gap="xs">
            <Select
              value={language}
              onChange={(val) => setLanguage(val as 'ja' | 'es')}
              data={[
                { value: 'ja', label: '🇯🇵 JA' },
                { value: 'es', label: '🇪🇸 ES' }
              ]}
              styles={{ input: { width: 80 } }}
              size="sm"
            />
            <Button 
              leftSection={<IconPlus size={14} />}
              onClick={() => setShowNewChatModal(true)}
              size="sm"
              visibleFrom="xs"
            >
              Nuevo
            </Button>
            <ActionIcon
              variant="filled"
              onClick={() => setShowNewChatModal(true)}
              hiddenFrom="xs"
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Stack h="100%" gap="xs">
          <Group justify="space-between">
            <Text fw={600} size="xs" c="dimmed">CONVERSACIONES</Text>
            {currentSession && (
              <ActionIcon
                variant="subtle"
                onClick={() => setCurrentSession(null)}
                hiddenFrom="sm"
                size="sm"
              >
                <IconX size={16} />
              </ActionIcon>
            )}
          </Group>
          
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="xs">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  p="xs"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    backgroundColor: currentSession?.id === session.id ? 'var(--mantine-color-blue-0)' : undefined
                  }}
                  onClick={() => selectSession(session)}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} lineClamp={1}>
                        {session.topic}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {session.message_count || 0} mensajes
                      </Text>
                    </Stack>
                    <Menu position="left-start">
                      <Menu.Target>
                        <ActionIcon 
                          variant="subtle" 
                          size="xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconDotsVertical size={14} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSession(session.id)
                          }}
                        >
                          Eliminar
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {currentSession ? (
          <Stack h="100%" p="sm" gap="sm">
            {/* Chat Header */}
            <Paper p="xs" withBorder>
              <Group justify="space-between">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={600} size="sm" lineClamp={1}>{currentSession.topic}</Text>
                  <Badge size="xs" variant="light">
                    {language === 'ja' ? 'Modo Japonés' : 'Modo Español'}
                  </Badge>
                </div>
                <ActionIcon
                  variant="subtle"
                  onClick={() => setCurrentSession(null)}
                  hiddenFrom="sm"
                  size="sm"
                >
                  <IconMessageCircle size={16} />
                </ActionIcon>
              </Group>
            </Paper>

            {/* Messages Area */}
            <ScrollArea 
              style={{ flex: 1 }} 
              viewportRef={scrollAreaRef}
            >
              <Stack gap="sm" pb="md">
                {messages.length === 0 && (
                  <Text ta="center" c="dimmed" mt="xl" size="sm">
                    Empieza una conversación en {language === 'ja' ? 'japonés' : 'español'}
                  </Text>
                )}
                
                {messages.map((msg) => (
                  <Group
                    key={msg.id}
                    align="flex-start"
                    justify={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                    px="xs"
                  >
                    {msg.role === 'assistant' && (
                      <ActionIcon size="sm" variant="light" color="blue">
                        <IconRobot size={16} />
                      </ActionIcon>
                    )}
                    
                    <Paper
                      p="sm"
                      withBorder
                      style={{
                        maxWidth: '85%',
                        backgroundColor: msg.role === 'user' 
                          ? 'var(--mantine-color-blue-0)' 
                          : 'var(--mantine-color-gray-0)'
                      }}
                    >
                      <Stack gap="xs">
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.content}
                        </Text>
                        <Group gap={4}>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={() => speak(msg.content, language)}
                            title="Escuchar"
                          >
                            <IconVolume size={14} />
                          </ActionIcon>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={() => translateMessage(msg.content, language === 'ja' ? 'es' : 'ja')}
                            title="Traducir"
                          >
                            <IconLanguage size={14} />
                          </ActionIcon>
                        </Group>
                      </Stack>
                    </Paper>
                    
                    {msg.role === 'user' && (
                      <ActionIcon size="sm" variant="light" color="green">
                        <IconUser size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}
                
                {loading && (
                  <Group justify="flex-start" px="xs">
                    <ActionIcon size="sm" variant="light" color="blue">
                      <IconRobot size={16} />
                    </ActionIcon>
                    <Paper p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                      <Group gap="xs">
                        <Loader size="xs" />
                        <Text size="xs" c="dimmed">Escribiendo...</Text>
                      </Group>
                    </Paper>
                  </Group>
                )}
              </Stack>
            </ScrollArea>

            {/* Input Area */}
            <Paper p="sm" withBorder>
              <Group gap="xs">
                <TextInput
                  style={{ flex: 1 }}
                  placeholder={`Escribe en ${language === 'ja' ? 'japonés' : 'español'}...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.currentTarget.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  disabled={loading}
                  size="sm"
                />
                <ActionIcon
                  size="lg"
                  variant="filled"
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || loading}
                >
                  <IconSend size={18} />
                </ActionIcon>
              </Group>
            </Paper>
          </Stack>
        ) : (
          <Center h="100%" p="md">
            <Stack align="center" gap="xl">
              <IconMessageCircle size={48} stroke={1.5} style={{ color: 'var(--mantine-color-gray-5)' }} />
              <Stack align="center" gap="sm">
                <Title order={4} c="dimmed" ta="center">Bienvenido al Chat</Title>
                <Text c="dimmed" ta="center" maw={400} size="sm">
                  Selecciona una conversación o crea una nueva para practicar japonés
                </Text>
                <Button 
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setShowNewChatModal(true)}
                  mt="md"
                  size="sm"
                >
                  Iniciar Nueva Conversación
                </Button>
              </Stack>
            </Stack>
          </Center>
        )}
      </AppShell.Main>

      {/* New Chat Modal */}
      <Modal
        opened={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        title="Nueva Conversación"
        centered
      >
        <Stack>
          <Select
            label="Selecciona un tema"
            placeholder="Elige un tema para la conversación"
            value={selectedTopic}
            onChange={(val) => setSelectedTopic(val || 'general')}
            data={CHAT_TOPICS}
          />
          <Text size="sm" c="dimmed">
            El chat te ayudará a practicar japonés con conversaciones adaptadas al tema elegido.
          </Text>
          <Group justify="end">
            <Button variant="light" onClick={() => setShowNewChatModal(false)}>
              Cancelar
            </Button>
            <Button onClick={createNewSession}>
              Crear Conversación
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  )
}
