import React, { useEffect, useState } from 'react'
import { AppShell, Button, Card, Center, Group, Stack, Text, Title } from '@mantine/core'
import { IconEye, IconRefresh, IconVolume, IconMessageCircle } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

type Word = { id: number; kanji: string; romaji?: string; translation: string }

export default function App() {
  const [word, setWord] = useState<Word | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)

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
    const res = await fetch('http://rpi4.netbird.selfhosted:3000/api/random')
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
      <AppShell header={{ height: 60 }}>
        <AppShell.Header>
          <Group px="md" h="100%" align="center" justify="space-between">
            <Title order={4}>JP Flashcards</Title>
            <Group>
              <Button variant="subtle" component={Link} to="/chat" leftSection={<IconMessageCircle size={16} />}>
                Chat
              </Button>
              <Button variant="subtle" component={Link} to="/admin">Admin</Button>
            </Group>
          </Group>
        </AppShell.Header>
        <AppShell.Main>
          <Center mih="80vh">
            <Card shadow="sm" radius="lg" p="xl" withBorder style={{ width: 520 }}>
              <Stack gap="md" align="center">
                <Title order={1}>{word?.kanji ?? '...'}</Title>
                <Text c="dimmed" size="lg">{word?.romaji}</Text>

                {showTranslation ? (
                    <Text size="lg" ta="center">{word?.translation}</Text>
                ) : (
                    <Text size="lg" ta="center" c="dimmed">Traducción oculta</Text>
                )}

                <Group justify="center" wrap="wrap">
                  <Button leftSection={<IconEye size={16} />} onClick={() => setShowTranslation(s => !s)}>
                    {showTranslation ? 'Ocultar' : 'Mostrar traducción'}
                  </Button>
                  <Button leftSection={<IconRefresh size={16} />} variant="outline" onClick={fetchRandom}>
                    Nueva aleatoria
                  </Button>
                  {/* ---------- TTS: botón ---------- */}
                  <Button
                      leftSection={<IconVolume size={16} />}
                      variant="default"
                      onClick={speak}
                      disabled={!speechReady || !word}
                      title={!speechReady ? 'TTS no disponible en este navegador' : 'Reproducir pronunciación'}
                  >
                    Escuchar
                  </Button>
                  {/* ---------- fin TTS ---------- */}
                </Group>

                {/* Mensaje de compatibilidad opcional */}
                {!speechReady && (
                    <Text size="sm" c="dimmed" ta="center">
                      El TTS no está disponible en este navegador/dispositivo.
                    </Text>
                )}
              </Stack>
            </Card>
          </Center>
        </AppShell.Main>
      </AppShell>
  )
}
