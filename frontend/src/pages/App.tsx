import React, { useEffect, useState } from 'react'
import { AppShell, Button, Card, Center, Group, Stack, Text, Title, Burger, Drawer, ScrollArea } from '@mantine/core'
import { IconEye, IconRefresh, IconVolume, IconMessageCircle, IconBrain, IconSettings } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useDisclosure } from '@mantine/hooks'

type Word = { id: number; kanji: string; romaji?: string; translation: string }

export default function App() {
  const [word, setWord] = useState<Word | null>(null)
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

  const fetchRandom = async () => {
    setShowTranslation(false)
    const res = await fetch('http://rpi4.netbird.vpn:3000/api/random')
    const data = await res.json()
    setWord(data)
  }
  useEffect(() => { fetchRandom() }, [])

  // ---------- TTS: hablar la palabra (kanji) ----------
  const speak = () => {
    if (!word || !('speechSynthesis' in window)) return
    const text = word.kanji || '' // leeremos el kanji
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
            <Button
              component={Link}
              to="/admin"
              leftSection={<IconSettings size={16} />}
              onClick={close}
              fullWidth
            >
              Administrar
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
              <Group visibleFrom="sm">
                <Button variant="subtle" component={Link} to="/quiz" leftSection={<IconBrain size={16} />}>
                  Quiz
                </Button>
                <Button variant="subtle" component={Link} to="/chat" leftSection={<IconMessageCircle size={16} />}>
                  Chat
                </Button>
                <Button variant="subtle" component={Link} to="/admin">Admin</Button>
              </Group>
            </Group>
          </AppShell.Header>
          <AppShell.Main>
            <Center style={{ minHeight: 'calc(100vh - 60px)', padding: '1rem' }}>
              <Card shadow="sm" radius="lg" padding="md" withBorder style={{ width: '100%', maxWidth: 520 }}>
                <Stack gap="md" align="center">
                  <Title order={2} ta="center">{word?.kanji ?? '...'}</Title>
                  <Text c="dimmed" size="md">{word?.romaji}</Text>

                  {showTranslation ? (
                      <Text size="md" ta="center">{word?.translation}</Text>
                  ) : (
                      <Text size="md" ta="center" c="dimmed">Traducción oculta</Text>
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
                          disabled={!speechReady || !word}
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
