import React, { useEffect, useState } from 'react'
import { AppShell, Button, Card, Center, Group, Stack, Text, Title, Burger, Drawer, ScrollArea, SegmentedControl, Avatar } from '@mantine/core'
import { IconEye, IconRefresh, IconVolume, IconMessageCircle, IconBrain, IconSettings, IconBook2, IconLogout } from '@tabler/icons-react'
import { Link, useNavigate } from 'react-router-dom'
import { useDisclosure } from '@mantine/hooks'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

type Word = { id: number; kanji: string; romaji?: string; translation: string }
type Kanji = { id: number; kanji: string; onyomi?: string; kunyomi?: string; translation: string }

export default function App() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'vocabulario' | 'kanji'>('vocabulario')
  const [word, setWord] = useState<Word | null>(null)
  const [kanji, setKanji] = useState<Kanji | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [opened, { open, close }] = useDisclosure(false)

  // ---------- TTS: estado y selección de voz JA ----------
  const [speechReady, setSpeechReady] = useState(false)
  const [jaVoice, setJaVoice] = useState<SpeechSynthesisVoice | null>(null)

  const pickVoices = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const voices = window.speechSynthesis.getVoices()
    const ja = voices.find(v => (v.lang || '').toLowerCase().startsWith('ja')) || null
    setJaVoice(ja)
    // Aunque no haya voz JA, marcamos ready si hay soporte (usará el motor por defecto con lang ja-JP)
    setSpeechReady(true)
  }

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    // Intento inicial (algunos navegadores devuelven [] la primera vez)
    pickVoices()
    // Cuando el navegador termine de cargar voces
    window.speechSynthesis.onvoiceschanged = pickVoices
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = null }
  }, [])
  // ---------- fin TTS ----------

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const fetchRandom = async () => {
    setShowTranslation(false)
    if (mode === 'vocabulario') {
      const { data } = await api.get('/api/random')
      setWord(data)
      setKanji(null)
    } else {
      const { data } = await api.get('/api/kanji/random')
      setKanji(data)
      setWord(null)
    }
  }
  useEffect(() => { fetchRandom() }, [mode])

  // ---------- TTS: hablar la palabra (kanji) ----------
  const speak = () => {
    if (!('speechSynthesis' in window)) return
    const text = (mode === 'vocabulario' ? word?.kanji : kanji?.kanji) || ''
    if (!text) return

    // Cancelar cualquier reproducción anterior
    window.speechSynthesis.cancel()

    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    if (jaVoice) u.voice = jaVoice
    u.rate = 0.95   // un pelín más despacio, más claro
    u.pitch = 1.0
    u.volume = 1.0

    window.speechSynthesis.speak(u)
  }
  // ---------- fin TTS ----------

  return (
      <>
        <Drawer
          opened={opened}
          onClose={close}
          title="Menú"
          padding="md"
          size="sm"
        >
          <Stack>
            <Group align="center">
              <Avatar color="blue" radius="xl">{user?.username.charAt(0).toUpperCase()}</Avatar>
              <Text size="sm" fw={500}>{user?.username}</Text>
            </Group>
            <Button
              component={Link}
              to="/quiz"
              leftSection={<IconBrain size={16} />}
              onClick={close}
              fullWidth
            >
              Quiz
            </Button>
            <Button
              component={Link}
              to="/chat"
              leftSection={<IconMessageCircle size={16} />}
              onClick={close}
              fullWidth
            >
              Chat
            </Button>
            {isAdmin && (
              <Button
                component={Link}
                to="/admin"
                leftSection={<IconSettings size={16} />}
                onClick={close}
                fullWidth
              >
                Administrar
              </Button>
            )}
            <Button
              component={Link}
              to="/lecciones"
              leftSection={<IconBook2 size={16} />}
              onClick={close}
              fullWidth
            >
              Lecciones
            </Button>
            <Button
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
              fullWidth
              variant="light"
              color="red"
            >
              Cerrar sesión
            </Button>
          </Stack>
        </Drawer>

        <AppShell header={{ height: 60 }}>
          <AppShell.Header>
            <Group px="md" h="100%" align="center" justify="space-between">
              <Group>
                <Burger
                  opened={opened}
                  onClick={open}
                  hiddenFrom="sm"
                  size="sm"
                />
                <Title order={4}>JP Flashcards</Title>
              </Group>
              <Group visibleFrom="sm" gap="xs">
                <Avatar color="blue" radius="xl" size="md">{user?.username.charAt(0).toUpperCase()}</Avatar>
                <Text size="sm" fw={500}>{user?.username}</Text>
                <Button variant="subtle" component={Link} to="/quiz" leftSection={<IconBrain size={16} />}>
                  Quiz
                </Button>
                <Button variant="subtle" component={Link} to="/chat" leftSection={<IconMessageCircle size={16} />}>
                  Chat
                </Button>
                <Button variant="subtle" component={Link} to="/lecciones" leftSection={<IconBook2 size={16} />}>
                  Lecciones
                </Button>
                {isAdmin && (
                  <Button variant="subtle" component={Link} to="/admin">Admin</Button>
                )}
                <Button variant="subtle" color="red" onClick={handleLogout} leftSection={<IconLogout size={16} />}>
                  Salir
                </Button>
              </Group>
            </Group>
          </AppShell.Header>
          <AppShell.Main>
            <Center style={{ minHeight: 'calc(100vh - 60px)', padding: '1rem' }}>
              <Card shadow="sm" radius="lg" padding="md" withBorder className="flashcard" style={{ width: '100%' }}>
                <Stack gap="md" align="center">
                  <SegmentedControl
                    data={[
                      { label: 'Vocabulario', value: 'vocabulario' },
                      { label: 'Kanji', value: 'kanji' },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as 'vocabulario' | 'kanji')}
                    fullWidth
                  />

                  {mode === 'vocabulario' ? (
                    <>
                      <Title order={2} ta="center" className="flashcard-word">{word?.kanji ?? '...'}</Title>
                      <Text c="dimmed" className="flashcard-reading">{word?.romaji}</Text>

                      {showTranslation ? (
                        <Text ta="center" className="flashcard-translation">{word?.translation}</Text>
                      ) : (
                        <Text ta="center" c="dimmed" className="flashcard-translation">Traducción oculta</Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Title order={2} ta="center" className="flashcard-word">{kanji?.kanji ?? '...'}</Title>
                      <Stack gap="xs" align="center">
                        {kanji?.onyomi && (
                          <Text c="dimmed" className="flashcard-label">Onyomi: {kanji.onyomi}</Text>
                        )}
                        {kanji?.kunyomi && (
                          <Text c="dimmed" className="flashcard-label">Kunyomi: {kanji.kunyomi}</Text>
                        )}
                      </Stack>

                      {showTranslation ? (
                        <Text ta="center" className="flashcard-translation">{kanji?.translation}</Text>
                      ) : (
                        <Text ta="center" c="dimmed" className="flashcard-translation">Traducción oculta</Text>
                      )}
                    </>
                  )}

                  <Stack w="100%" gap="xs">
                    <Group justify="center" wrap="wrap" gap="xs">
                      <Button
                        leftSection={<IconEye size={16} />}
                        onClick={() => setShowTranslation(s => !s)}
                        size="sm"
                      >
                        {showTranslation ? 'Ocultar' : 'Mostrar'}
                      </Button>
                      <Button
                        leftSection={<IconRefresh size={16} />}
                        variant="outline"
                        onClick={fetchRandom}
                        size="sm"
                      >
                        Nueva
                      </Button>
                      {/* ---------- TTS: botón ---------- */}
                      <Button
                        leftSection={<IconVolume size={16} />}
                        variant="default"
                        onClick={speak}
                        disabled={!speechReady || !(mode === 'vocabulario' ? word : kanji)}
                        title={!speechReady ? 'TTS no disponible en este navegador' : 'Reproducir pronunciación'}
                        size="sm"
                      >
                        Escuchar
                      </Button>
                      {/* ---------- fin TTS ---------- */}
                    </Group>
                  </Stack>

                  {/* Mensaje de compatibilidad opcional */}
                  {!speechReady && (
                    <Text size="xs" c="dimmed" ta="center">
                      El TTS no está disponible en este navegador/dispositivo.
                    </Text>
                  )}
                </Stack>
              </Card>
            </Center>
          </AppShell.Main>
        </AppShell>
      </>
  )
}
