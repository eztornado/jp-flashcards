import React, { useEffect, useState } from 'react'
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
  Progress,
  Badge,
  ActionIcon,
  Paper,
  Grid,
  Tabs,
  Alert,
  Container,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconChevronLeft,
  IconRefresh,
  IconCheck,
  IconX,
  IconBrain,
  IconCards,
  IconWriting,
  IconLanguage,
  IconTrophy,
  IconVolume,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'

type Word = { 
  id: number
  kanji: string
  romaji?: string
  translation: string 
}

type MatchingPair = {
  word: Word
  matched: boolean
  position: number
}

export default function Quiz() {
  // Estados comunes
  const [currentTab, setCurrentTab] = useState<string | null>('matching')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  
  // TTS Setup
  const [speechReady, setSpeechReady] = useState(false)
  const [jaVoice, setJaVoice] = useState<SpeechSynthesisVoice | null>(null)

  // Quiz de emparejamiento
  const [matchingWords, setMatchingWords] = useState<Word[]>([])
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [selectedRight, setSelectedRight] = useState<number | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set())
  const [shuffledTranslations, setShuffledTranslations] = useState<string[]>([])

  // Quiz de traducción
  const [translationWord, setTranslationWord] = useState<any>(null)
  const [translationAnswer, setTranslationAnswer] = useState('')
  const [translationMode, setTranslationMode] = useState<'jp-to-es' | 'es-to-jp'>('jp-to-es')
  const [showTranslationResult, setShowTranslationResult] = useState(false)
  const [isTranslationCorrect, setIsTranslationCorrect] = useState(false)

  // Quiz de completar romaji
  const [romajiWord, setRomajiWord] = useState<any>(null)
  const [romajiAnswer, setRomajiAnswer] = useState('')
  const [showRomajiResult, setShowRomajiResult] = useState(false)
  const [isRomajiCorrect, setIsRomajiCorrect] = useState(false)

  // TTS setup
  const pickVoices = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const voices = window.speechSynthesis.getVoices()
    const ja = voices.find(v => (v.lang || '').toLowerCase().startsWith('ja')) || null
    setJaVoice(ja)
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

  const speak = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return
    
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    if (jaVoice) u.voice = jaVoice
    u.rate = 0.95
    u.pitch = 1.0
    u.volume = 1.0
    
    window.speechSynthesis.speak(u)
  }

  // Cargar quiz de emparejamiento
  const loadMatchingQuiz = async () => {
    try {
      const res = await fetch('http://rpi4.netbird.selfhosted:3000/api/quiz/matching')
      const words = await res.json()
      setMatchingWords(words)
      
      // Mezclar las traducciones
      const translations = words.map((w: Word) => w.translation)
      const shuffled = [...translations].sort(() => Math.random() - 0.5)
      setShuffledTranslations(shuffled)
      
      setSelectedLeft(null)
      setSelectedRight(null)
      setMatchedPairs(new Set())
    } catch (error) {
      console.error('Error loading matching quiz:', error)
    }
  }

  // Cargar quiz de traducción
  const loadTranslationQuiz = async () => {
    try {
      const res = await fetch(`http://rpi4.netbird.selfhosted:3000/api/quiz/translation?mode=${translationMode}`)
      const data = await res.json()
      setTranslationWord(data)
      setTranslationAnswer('')
      setShowTranslationResult(false)
      setIsTranslationCorrect(false)
    } catch (error) {
      console.error('Error loading translation quiz:', error)
    }
  }

  // Cargar quiz de completar romaji
  const loadRomajiQuiz = async () => {
    try {
      const res = await fetch('http://rpi4.netbird.selfhosted:3000/api/quiz/fill-romaji')
      if (!res.ok) {
        notifications.show({
          color: 'red',
          title: 'Error',
          message: 'No hay palabras disponibles para este quiz'
        })
        return
      }
      const data = await res.json()
      setRomajiWord(data)
      setRomajiAnswer('')
      setShowRomajiResult(false)
      setIsRomajiCorrect(false)
    } catch (error) {
      console.error('Error loading romaji quiz:', error)
    }
  }

  // Efectos para cargar cada quiz cuando se cambia de tab
  useEffect(() => {
    if (currentTab === 'matching') {
      loadMatchingQuiz()
    } else if (currentTab === 'translation') {
      loadTranslationQuiz()
    } else if (currentTab === 'romaji') {
      loadRomajiQuiz()
    }
  }, [currentTab, translationMode])

  // Lógica de emparejamiento
  const handleMatchingClick = (side: 'left' | 'right', index: number) => {
    if (side === 'left') {
      if (matchedPairs.has(index)) return
      setSelectedLeft(index)
      
      // Si hay algo seleccionado a la derecha, verificar match
      if (selectedRight !== null) {
        checkMatch(index, selectedRight)
      }
    } else {
      setSelectedRight(index)
      
      // Si hay algo seleccionado a la izquierda, verificar match
      if (selectedLeft !== null) {
        checkMatch(selectedLeft, index)
      }
    }
  }

  const checkMatch = (leftIndex: number, rightIndex: number) => {
    const word = matchingWords[leftIndex]
    const translation = shuffledTranslations[rightIndex]
    
    if (word.translation === translation) {
      // Correcto!
      setMatchedPairs(new Set([...matchedPairs, leftIndex]))
      setScore(score + 1)
      setStreak(streak + 1)
      setTotalAnswered(totalAnswered + 1)
      
      notifications.show({
        color: 'teal',
        title: '¡Correcto!',
        message: `${word.kanji} = ${translation}`,
        icon: <IconCheck />
      })
      
      // Limpiar selecciones
      setSelectedLeft(null)
      setSelectedRight(null)
      
      // Si completó todos, recargar
      if (matchedPairs.size === matchingWords.length - 1) {
        setTimeout(() => {
          notifications.show({
            color: 'yellow',
            title: '¡Completado!',
            message: 'Cargando nuevas palabras...',
            icon: <IconTrophy />
          })
          loadMatchingQuiz()
        }, 1000)
      }
    } else {
      // Incorrecto
      setStreak(0)
      setTotalAnswered(totalAnswered + 1)
      
      notifications.show({
        color: 'red',
        title: 'Incorrecto',
        message: 'Intenta de nuevo',
        icon: <IconX />
      })
      
      // Limpiar selecciones
      setSelectedLeft(null)
      setSelectedRight(null)
    }
  }

  // Verificar traducción
  const checkTranslation = async () => {
    if (!translationWord || !translationAnswer.trim()) return
    
    try {
      const res = await fetch('http://rpi4.netbird.selfhosted:3000/api/quiz/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: translationWord.word.id,
          answer: translationAnswer,
          type: `translation-${translationMode}`
        })
      })
      
      const result = await res.json()
      setIsTranslationCorrect(result.isCorrect)
      setShowTranslationResult(true)
      setTotalAnswered(totalAnswered + 1)
      
      if (result.isCorrect) {
        setScore(score + 1)
        setStreak(streak + 1)
        notifications.show({
          color: 'teal',
          title: '¡Correcto!',
          icon: <IconCheck />
        })
      } else {
        setStreak(0)
        notifications.show({
          color: 'red',
          title: 'Incorrecto',
          message: `La respuesta correcta es: ${result.correctAnswer}`,
          icon: <IconX />
        })
      }
    } catch (error) {
      console.error('Error checking translation:', error)
    }
  }

  // Verificar romaji
  const checkRomaji = async () => {
    if (!romajiWord || !romajiAnswer.trim()) return
    
    try {
      const res = await fetch('http://rpi4.netbird.selfhosted:3000/api/quiz/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: romajiWord.id,
          answer: romajiAnswer,
          type: 'fill-romaji'
        })
      })
      
      const result = await res.json()
      setIsRomajiCorrect(result.isCorrect)
      setShowRomajiResult(true)
      setTotalAnswered(totalAnswered + 1)
      
      if (result.isCorrect) {
        setScore(score + 1)
        setStreak(streak + 1)
        notifications.show({
          color: 'teal',
          title: '¡Correcto!',
          icon: <IconCheck />
        })
      } else {
        setStreak(0)
        notifications.show({
          color: 'red',
          title: 'Incorrecto',
          message: `La respuesta correcta es: ${result.correctAnswer}`,
          icon: <IconX />
        })
      }
    } catch (error) {
      console.error('Error checking romaji:', error)
    }
  }

  const getAccuracy = () => {
    if (totalAnswered === 0) return 0
    return Math.round((score / totalAnswered) * 100)
  }

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Group px="md" h="100%" align="center" justify="space-between">
          <Group gap="xs">
            <ActionIcon variant="subtle" component={Link} to="/">
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Title order={5}>Quiz</Title>
          </Group>
          
          <Group gap="xs">
            <Badge size="sm" variant="filled" color="blue">
              P: {score}
            </Badge>
            <Badge size="sm" variant="filled" color="orange">
              R: {streak}
            </Badge>
            <Badge size="sm" variant="filled" color="green" visibleFrom="xs">
              {getAccuracy()}%
            </Badge>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl" py="sm">
          <Tabs value={currentTab} onChange={setCurrentTab}>
            <Tabs.List grow>
              <Tabs.Tab value="matching" leftSection={<IconCards size={14} />}>
                Emparejar
              </Tabs.Tab>
              <Tabs.Tab value="translation" leftSection={<IconLanguage size={14} />}>
                Traducción
              </Tabs.Tab>
              <Tabs.Tab value="romaji" leftSection={<IconWriting size={14} />}>
                Romaji
              </Tabs.Tab>
            </Tabs.List>

            {/* Quiz de Emparejamiento */}
            <Tabs.Panel value="matching" pt="sm">
              <Card withBorder p="sm">
                <Stack gap="sm">
                  <Alert 
                    icon={<IconBrain />} 
                    title="Une las palabras" 
                    color="blue"
                    styles={{ title: { fontSize: '0.9rem' } }}
                  >
                    <Text size="xs">Selecciona una palabra y su traducción</Text>
                  </Alert>
                  
                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Stack gap="xs">
                        <Text fw={600} size="xs" c="dimmed">JAPONÉS</Text>
                        {matchingWords.map((word, index) => (
                          <Paper
                            key={word.id}
                            p="sm"
                            withBorder
                            style={{
                              cursor: matchedPairs.has(index) ? 'default' : 'pointer',
                              backgroundColor: matchedPairs.has(index) 
                                ? 'var(--mantine-color-green-0)'
                                : selectedLeft === index 
                                ? 'var(--mantine-color-blue-0)' 
                                : undefined,
                              opacity: matchedPairs.has(index) ? 0.6 : 1
                            }}
                            onClick={() => handleMatchingClick('left', index)}
                          >
                            <Group justify="space-between" wrap="nowrap">
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <Text size="sm" fw={600} truncate>{word.kanji}</Text>
                                <Text size="xs" c="dimmed" truncate>{word.romaji}</Text>
                              </div>
                              <Group gap={4} wrap="nowrap">
                                {speechReady && (
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      speak(word.kanji)
                                    }}
                                  >
                                    <IconVolume size={14} />
                                  </ActionIcon>
                                )}
                                {matchedPairs.has(index) && (
                                  <Badge size="xs" color="green">✓</Badge>
                                )}
                              </Group>
                            </Group>
                          </Paper>
                        ))}
                      </Stack>
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Stack gap="xs">
                        <Text fw={600} size="xs" c="dimmed">ESPAÑOL</Text>
                        {shuffledTranslations.map((translation, index) => {
                          const isMatched = matchingWords.some((word, wIndex) => 
                            matchedPairs.has(wIndex) && word.translation === translation
                          )
                          
                          return (
                            <Paper
                              key={index}
                              p="sm"
                              withBorder
                              style={{
                                cursor: isMatched ? 'default' : 'pointer',
                                backgroundColor: isMatched
                                  ? 'var(--mantine-color-green-0)'
                                  : selectedRight === index
                                  ? 'var(--mantine-color-blue-0)'
                                  : undefined,
                                opacity: isMatched ? 0.6 : 1
                              }}
                              onClick={() => !isMatched && handleMatchingClick('right', index)}
                            >
                              <Group justify="space-between">
                                <Text size="sm" style={{ wordBreak: 'break-word' }}>{translation}</Text>
                                {isMatched && (
                                  <Badge size="xs" color="green">✓</Badge>
                                )}
                              </Group>
                            </Paper>
                          )
                        })}
                      </Stack>
                    </Grid.Col>
                  </Grid>
                  
                  <Group justify="center" mt="sm">
                    <Button
                      leftSection={<IconRefresh size={14} />}
                      onClick={loadMatchingQuiz}
                      variant="light"
                      size="sm"
                    >
                      Nuevas palabras
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Tabs.Panel>

            {/* Quiz de Traducción */}
            <Tabs.Panel value="translation" pt="md">
              <Card withBorder p="lg">
                <Stack>
                  <Group justify="space-between">
                    <Alert icon={<IconLanguage />} title="Traduce la palabra" color="cyan" style={{ flex: 1 }}>
                      {translationMode === 'jp-to-es' 
                        ? 'Escribe la traducción en español'
                        : 'Escribe la palabra en japonés'}
                    </Alert>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTranslationMode(translationMode === 'jp-to-es' ? 'es-to-jp' : 'jp-to-es')
                        setShowTranslationResult(false)
                      }}
                    >
                      Cambiar modo
                    </Button>
                  </Group>
                  
                  {translationWord && (
                    <Center>
                      <Paper p="xl" withBorder style={{ minWidth: 300 }}>
                        <Stack align="center">
                          {translationMode === 'jp-to-es' ? (
                            <>
                              <Text size="xl" fw={700}>{translationWord.word.kanji}</Text>
                              <Text size="md" c="dimmed">{translationWord.word.romaji}</Text>
                              {speechReady && (
                                <ActionIcon
                                  variant="light"
                                  onClick={() => speak(translationWord.word.kanji)}
                                >
                                  <IconVolume size={20} />
                                </ActionIcon>
                              )}
                            </>
                          ) : (
                            <Text size="xl" fw={700}>{translationWord.word.translation}</Text>
                          )}
                          
                          <TextInput
                            placeholder={translationMode === 'jp-to-es' 
                              ? 'Escribe en español...' 
                              : 'Escribe en japonés...'}
                            value={translationAnswer}
                            onChange={(e) => setTranslationAnswer(e.currentTarget.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !showTranslationResult) {
                                checkTranslation()
                              }
                            }}
                            disabled={showTranslationResult}
                            style={{ minWidth: 250 }}
                          />
                          
                          {!showTranslationResult ? (
                            <Button
                              onClick={checkTranslation}
                              disabled={!translationAnswer.trim()}
                            >
                              Verificar
                            </Button>
                          ) : (
                            <Stack align="center">
                              <Badge
                                size="xl"
                                color={isTranslationCorrect ? 'green' : 'red'}
                              >
                                {isTranslationCorrect ? '¡Correcto!' : 'Incorrecto'}
                              </Badge>
                              <Button
                                leftSection={<IconRefresh size={16} />}
                                onClick={loadTranslationQuiz}
                              >
                                Siguiente palabra
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      </Paper>
                    </Center>
                  )}
                </Stack>
              </Card>
            </Tabs.Panel>

            {/* Quiz de Completar Romaji */}
            <Tabs.Panel value="romaji" pt="md">
              <Card withBorder p="lg">
                <Stack>
                  <Alert icon={<IconWriting />} title="Completa la pronunciación (romaji)" color="grape">
                    Escribe las letras que faltan en la pronunciación
                  </Alert>
                  
                  {romajiWord && (
                    <Center>
                      <Paper p="xl" withBorder style={{ minWidth: 300 }}>
                        <Stack align="center">
                          <Text size="xl" fw={700}>{romajiWord.kanji}</Text>
                          <Text size="md" c="dimmed">{romajiWord.translation}</Text>
                          
                          {speechReady && (
                            <ActionIcon
                              variant="light"
                              onClick={() => speak(romajiWord.kanji)}
                              mb="md"
                            >
                              <IconVolume size={20} />
                            </ActionIcon>
                          )}
                          
                          <Text size="xl" style={{ fontFamily: 'monospace', letterSpacing: 2 }}>
                            {romajiWord.maskedRomaji}
                          </Text>
                          
                          <TextInput
                            placeholder="Completa el romaji..."
                            value={romajiAnswer}
                            onChange={(e) => setRomajiAnswer(e.currentTarget.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !showRomajiResult) {
                                checkRomaji()
                              }
                            }}
                            disabled={showRomajiResult}
                            style={{ minWidth: 250 }}
                          />
                          
                          {!showRomajiResult ? (
                            <Button
                              onClick={checkRomaji}
                              disabled={!romajiAnswer.trim()}
                            >
                              Verificar
                            </Button>
                          ) : (
                            <Stack align="center">
                              <Badge
                                size="xl"
                                color={isRomajiCorrect ? 'green' : 'red'}
                              >
                                {isRomajiCorrect ? '¡Correcto!' : `Incorrecto - Era: ${romajiWord.romaji}`}
                              </Badge>
                              <Button
                                leftSection={<IconRefresh size={16} />}
                                onClick={loadRomajiQuiz}
                              >
                                Siguiente palabra
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      </Paper>
                    </Center>
                  )}
                </Stack>
              </Card>
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
