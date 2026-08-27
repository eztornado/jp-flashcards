import React, { useEffect, useState } from 'react'
import { AppShell, Button, Card, Group, Modal, Stack, Table, TextInput, Textarea, Text, Title, Pagination, FileInput, Tabs, Checkbox, Badge } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash, IconUpload, IconPhotoScan, IconBook2, IconExternalLink } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'


type Word = { id: number; kanji: string; romaji?: string; translation: string }
type Kanji = { id: number; kanji: string; onyomi?: string; kunyomi?: string; translation: string }
type Lesson = { id: number; title: string; description: string; created_at?: string; updated_at?: string }
type OcrWordItem = { kanji: string; romaji: string; translation: string; include: boolean }

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'vocabulario' | 'kanji' | 'lecciones'>('vocabulario')

  // Estados para vocabulario
  const [words, setWords] = useState<Word[]>([])
  const [wordsTotal, setWordsTotal] = useState(0)
  const [wordsPage, setWordsPage] = useState(1)
  const [wordsPageSize] = useState(20)
  const [wordsSearch, setWordsSearch] = useState('')
  const [wordModalOpened, setWordModalOpened] = useState(false)
  const [editingWord, setEditingWord] = useState<Word | null>(null)
  const [wordForm, setWordForm] = useState({ kanji: '', romaji: '', translation: '' })

  // Estados para kanji
  const [kanjis, setKanjis] = useState<Kanji[]>([])
  const [kanjiTotal, setKanjiTotal] = useState(0)
  const [kanjiPage, setKanjiPage] = useState(1)
  const [kanjiPageSize] = useState(20)
  const [kanjiSearch, setKanjiSearch] = useState('')
  const [kanjiModalOpened, setKanjiModalOpened] = useState(false)
  const [editingKanji, setEditingKanji] = useState<Kanji | null>(null)
  const [kanjiForm, setKanjiForm] = useState({ kanji: '', onyomi: '', kunyomi: '', translation: '' })

  // Estados para importación
  const [importOpened, setImportOpened] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  // Estados para importación por OCR
  const [ocrOpened, setOcrOpened] = useState(false)
  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrItems, setOcrItems] = useState<OcrWordItem[]>([])
  const [ocrSaving, setOcrSaving] = useState(false)
  const [ocrStep, setOcrStep] = useState<'upload' | 'review'>('upload')

  // Estados para lecciones
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonEditorOpened, setLessonEditorOpened] = useState(false)
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null)
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [lessonHtml, setLessonHtml] = useState('')
  const [lessonFiles, setLessonFiles] = useState<File[]>([])
  const [lessonGenerating, setLessonGenerating] = useState(false)
  const [lessonSaving, setLessonSaving] = useState(false)

  // Funciones para vocabulario
  async function loadWords() {
    const params = new URLSearchParams({
      page: String(wordsPage),
      pageSize: String(wordsPageSize),
      search: wordsSearch
    })
    const { data } = await api.get('/api/words?' + params.toString())
    setWords(data.items)
    setWordsTotal(data.total)
  }

  useEffect(() => { loadWords() }, [wordsPage, wordsSearch])

  function openNewWord() {
    setEditingWord(null)
    setWordForm({ kanji: '', romaji: '', translation: '' })
    setWordModalOpened(true)
  }

  function openEditWord(w: Word) {
    setEditingWord(w)
    setWordForm({ kanji: w.kanji, romaji: w.romaji ?? '', translation: w.translation })
    setWordModalOpened(true)
  }

  async function saveWord() {
    try {
      if (editingWord) {
        await api.put('/api/words/' + editingWord.id, wordForm)
      } else {
        await api.post('/api/words', wordForm)
      }
      setWordModalOpened(false)
      notifications.show({ color: 'teal', title: 'Guardado', message: 'Palabra guardada' })
      loadWords()
    } catch (err: any) {
      notifications.show({ color: 'red', title: 'Error', message: err?.response?.data?.error || 'Error al guardar' })
    }
  }

  async function removeWord(id: number) {
    if (!confirm('¿Eliminar esta palabra?')) return
    try {
      await api.delete('/api/words/' + id)
      notifications.show({ color: 'teal', title: 'Eliminada', message: 'Palabra eliminada' })
      loadWords()
    } catch (err: any) {
      notifications.show({ color: 'red', title: 'Error', message: 'No se pudo eliminar' })
    }
  }

  // Funciones para kanji
  async function loadKanjis() {
    const params = new URLSearchParams({
      page: String(kanjiPage),
      pageSize: String(kanjiPageSize),
      search: kanjiSearch
    })
    const { data } = await api.get('/api/kanji?' + params.toString())
    setKanjis(data.items)
    setKanjiTotal(data.total)
  }

  useEffect(() => { loadKanjis() }, [kanjiPage, kanjiSearch])

  function openNewKanji() {
    setEditingKanji(null)
    setKanjiForm({ kanji: '', onyomi: '', kunyomi: '', translation: '' })
    setKanjiModalOpened(true)
  }

  function openEditKanji(k: Kanji) {
    setEditingKanji(k)
    setKanjiForm({
      kanji: k.kanji,
      onyomi: k.onyomi ?? '',
      kunyomi: k.kunyomi ?? '',
      translation: k.translation
    })
    setKanjiModalOpened(true)
  }

  async function saveKanji() {
    try {
      if (editingKanji) {
        await api.put('/api/kanji/' + editingKanji.id, kanjiForm)
      } else {
        await api.post('/api/kanji', kanjiForm)
      }
      setKanjiModalOpened(false)
      notifications.show({ color: 'teal', title: 'Guardado', message: 'Kanji guardado' })
      loadKanjis()
    } catch (err: any) {
      notifications.show({ color: 'red', title: 'Error', message: err?.response?.data?.error || 'Error al guardar' })
    }
  }

  async function removeKanji(id: number) {
    if (!confirm('¿Eliminar este kanji?')) return
    try {
      await api.delete('/api/kanji/' + id)
      notifications.show({ color: 'teal', title: 'Eliminado', message: 'Kanji eliminado' })
      loadKanjis()
    } catch (err: any) {
      notifications.show({ color: 'red', title: 'Error', message: 'No se pudo eliminar' })
    }
  }

  // Función para importar
  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const { data } = await api.post('/api/import', fd)
      notifications.show({
        color: 'teal',
        title: 'Importación completada',
        message: `Hoja: ${data.sheet} • Filas: ${data.totalRows} • Insertadas: ${data.inserted} • Actualizadas: ${data.updated} • Omitidas: ${data.skipped}`
      })
      setImportOpened(false)
      setImportFile(null)
      loadWords()
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error al importar', message: e?.response?.data?.error || 'Error desconocido' })
    } finally {
      setImporting(false)
    }
  }

  // Funciones para importación por OCR
  async function handleOcrExtract() {
    if (!ocrFile) return
    setOcrLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', ocrFile)
      const { data } = await api.post('/api/import/ocr', fd)
      if (!data.items?.length) {
        notifications.show({ color: 'yellow', title: 'Sin resultados', message: 'No se detectaron palabras en la imagen' })
        return
      }
      setOcrItems(data.items.map((i: Omit<OcrWordItem, 'include'>) => ({ ...i, include: true })))
      setOcrStep('review')
      notifications.show({ color: 'teal', title: 'OCR completado', message: `${data.totalItems} palabras detectadas. Revísalas antes de guardar.` })
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error en OCR', message: e?.response?.data?.error || e?.message || 'Fallo procesando la imagen' })
    } finally {
      setOcrLoading(false)
    }
  }

  function updateOcrItem(index: number, field: keyof Omit<OcrWordItem, 'include'>, value: string) {
    setOcrItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  async function saveOcrItems() {
    const selected = ocrItems.filter((i) => i.include && i.kanji.trim() && i.translation.trim())
    if (selected.length === 0) {
      notifications.show({ color: 'yellow', title: 'Nada seleccionado', message: 'Selecciona al menos una palabra válida' })
      return
    }
    setOcrSaving(true)
    try {
      const { data } = await api.post('/api/import/ocr/save', {
        items: selected.map(({ kanji, romaji, translation }) => ({ kanji, romaji, translation }))
      })
      notifications.show({
        color: 'teal',
        title: 'Palabras guardadas',
        message: `Insertadas: ${data.inserted} • Actualizadas: ${data.updated}`
      })
      resetOcrModal()
      loadWords()
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e?.message || 'Fallo guardando las palabras' })
    } finally {
      setOcrSaving(false)
    }
  }

  function resetOcrModal() {
    setOcrOpened(false)
    setOcrFile(null)
    setOcrItems([])
    setOcrStep('upload')
  }

  // Funciones para lecciones
  async function loadLessons() {
    const { data } = await api.get('/api/lessons')
    setLessons(data)
  }

  useEffect(() => { loadLessons() }, [])

  function openNewLesson() {
    setEditingLessonId(null)
    setLessonTitle('')
    setLessonDescription('')
    setLessonHtml('')
    setLessonFiles([])
    setLessonEditorOpened(true)
  }

  function openEditLesson(l: Lesson) {
    api.get(`/api/lessons/${l.id}`)
      .then(({ data }) => {
        setEditingLessonId(l.id)
        setLessonTitle(data.title)
        setLessonDescription(data.description ?? '')
        setLessonHtml(data.html)
        setLessonFiles([])
        setLessonEditorOpened(true)
      })
  }

  async function generateLessonHtml() {
    if (!lessonFiles || lessonFiles.length === 0) {
      notifications.show({ color: 'yellow', title: 'Faltan capturas', message: 'Adjunta al menos una imagen o PDF de la lección' })
      return
    }
    setLessonGenerating(true)
    try {
      const fd = new FormData()
      for (const f of lessonFiles) fd.append('files', f)
      const { data } = await api.post('/api/lessons/generate', fd)
      setLessonHtml(data.html)
      if (data.suggestedTitle && !lessonTitle.trim()) setLessonTitle(data.suggestedTitle)
      notifications.show({ color: 'teal', title: 'Lección generada', message: 'Revisa y edita el contenido antes de guardar' })
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error generando lección', message: e?.response?.data?.error || e?.message || 'Fallo generando la lección' })
    } finally {
      setLessonGenerating(false)
    }
  }

  async function saveLesson() {
    if (!lessonTitle.trim() || !lessonHtml.trim()) {
      notifications.show({ color: 'yellow', title: 'Datos incompletos', message: 'La lección necesita título y contenido HTML' })
      return
    }
    setLessonSaving(true)
    try {
      const payload = { title: lessonTitle, description: lessonDescription, html: lessonHtml }
      if (editingLessonId) {
        await api.put(`/api/lessons/${editingLessonId}`, payload)
      } else {
        await api.post('/api/lessons', payload)
      }
      notifications.show({ color: 'teal', title: 'Guardada', message: 'Lección guardada correctamente' })
      setLessonEditorOpened(false)
      loadLessons()
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e?.message || 'Fallo guardando la lección' })
    } finally {
      setLessonSaving(false)
    }
  }

  async function removeLesson(id: number) {
    if (!confirm('¿Eliminar esta lección?')) return
    try {
      await api.delete(`/api/lessons/${id}`)
      notifications.show({ color: 'teal', title: 'Eliminada', message: 'Lección eliminada' })
      loadLessons()
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e?.response?.data?.error || 'No se pudo eliminar la lección' })
    }
  }

  // Función para limpiar BD
  async function clearDatabase(type: 'words' | 'kanji') {
    const confirmMsg = type === 'words'
      ? '⚠️ Esto eliminará TODAS las palabras de vocabulario. ¿Seguro que quieres continuar?'
      : '⚠️ Esto eliminará TODOS los kanji. ¿Seguro que quieres continuar?'

    if (!confirm(confirmMsg)) return

    try {
      const { data } = await api.delete(`/api/${type}`)
      notifications.show({
        color: 'teal',
        title: 'Base de datos limpiada',
        message: `Se eliminaron ${data.deleted ?? 0} registros`
      })
      if (type === 'words') {
        setWordsPage(1)
        loadWords()
      } else {
        setKanjiPage(1)
        loadKanjis()
      }
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e?.response?.data?.error || 'No se pudo limpiar la BD' })
    }
  }

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Group px="md" h="100%" align="center" justify="space-between">
          <Title order={4}>Admin - JP Flashcards</Title>
          <Group>
            <Button component={Link} to="/">Volver</Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Card withBorder radius="md" p="md" m="md">
          <Tabs value={activeTab} onChange={(v) => setActiveTab(v as 'vocabulario' | 'kanji' | 'lecciones')}>
            <Tabs.List>
              <Tabs.Tab value="vocabulario">Vocabulario</Tabs.Tab>
              <Tabs.Tab value="kanji">Kanji</Tabs.Tab>
              <Tabs.Tab value="lecciones" leftSection={<IconBook2 size={16} />}>Lecciones</Tabs.Tab>
            </Tabs.List>

            {/* Tab Vocabulario */}
            <Tabs.Panel value="vocabulario" pt="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <TextInput
                    placeholder="Buscar vocabulario..."
                    value={wordsSearch}
                    onChange={(e) => { setWordsPage(1); setWordsSearch(e.currentTarget.value) }}
                    style={{ flex: 1 }}
                  />
                  <Group gap="xs">
                    <Button
                      leftSection={<IconPhotoScan size={16} />}
                      variant="outline"
                      color="grape"
                      onClick={() => setOcrOpened(true)}
                    >
                      Importar con OCR
                    </Button>
                    <Button
                      leftSection={<IconUpload size={16} />}
                      variant="outline"
                      onClick={() => setImportOpened(true)}
                    >
                      Importar
                    </Button>
                    <Button
                      leftSection={<IconPlus size={16} />}
                      onClick={openNewWord}
                    >
                      Nueva
                    </Button>
                    <Button
                      color="red"
                      variant="light"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => clearDatabase('words')}
                    >
                      Limpiar
                    </Button>
                  </Group>
                </Group>

                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Kanji</Table.Th>
                      <Table.Th>Romaji</Table.Th>
                      <Table.Th>Traducción</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {words.map((w) => (
                      <Table.Tr key={w.id} onDoubleClick={() => openEditWord(w)}>
                        <Table.Td>{w.kanji}</Table.Td>
                        <Table.Td>{w.romaji}</Table.Td>
                        <Table.Td>{w.translation}</Table.Td>
                        <Table.Td width={120}>
                          <Group gap="xs" justify="end">
                            <Button size="xs" variant="light" onClick={() => openEditWord(w)}>Editar</Button>
                            <Button size="xs" color="red" leftSection={<IconTrash size={14} />} onClick={() => removeWord(w.id)}>Borrar</Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                <Group justify="center">
                  <Pagination total={Math.max(1, Math.ceil(wordsTotal / wordsPageSize))} value={wordsPage} onChange={setWordsPage} />
                </Group>
              </Stack>
            </Tabs.Panel>

            {/* Tab Kanji */}
            <Tabs.Panel value="kanji" pt="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <TextInput
                    placeholder="Buscar kanji..."
                    value={kanjiSearch}
                    onChange={(e) => { setKanjiPage(1); setKanjiSearch(e.currentTarget.value) }}
                    style={{ flex: 1 }}
                  />
                  <Group gap="xs">
                    <Button
                      leftSection={<IconPlus size={16} />}
                      onClick={openNewKanji}
                    >
                      Nuevo
                    </Button>
                    <Button
                      color="red"
                      variant="light"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => clearDatabase('kanji')}
                    >
                      Limpiar
                    </Button>
                  </Group>
                </Group>

                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Kanji</Table.Th>
                      <Table.Th>Onyomi</Table.Th>
                      <Table.Th>Kunyomi</Table.Th>
                      <Table.Th>Traducción</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {kanjis.map((k) => (
                      <Table.Tr key={k.id} onDoubleClick={() => openEditKanji(k)}>
                        <Table.Td>{k.kanji}</Table.Td>
                        <Table.Td>{k.onyomi}</Table.Td>
                        <Table.Td>{k.kunyomi}</Table.Td>
                        <Table.Td>{k.translation}</Table.Td>
                        <Table.Td width={120}>
                          <Group gap="xs" justify="end">
                            <Button size="xs" variant="light" onClick={() => openEditKanji(k)}>Editar</Button>
                            <Button size="xs" color="red" leftSection={<IconTrash size={14} />} onClick={() => removeKanji(k.id)}>Borrar</Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                <Group justify="center">
                  <Pagination total={Math.max(1, Math.ceil(kanjiTotal / kanjiPageSize))} value={kanjiPage} onChange={setKanjiPage} />
                </Group>
              </Stack>
            </Tabs.Panel>

            {/* Tab Lecciones */}
            <Tabs.Panel value="lecciones" pt="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Lecciones explicativas generadas a partir de capturas (OCR + IA). Visibles públicamente en /lecciones
                  </Text>
                  <Button leftSection={<IconPlus size={16} />} onClick={openNewLesson}>
                    Nueva lección
                  </Button>
                </Group>

                {lessons.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">Todavía no hay lecciones creadas</Text>
                ) : (
                  <Table striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Título</Table.Th>
                        <Table.Th>Descripción</Table.Th>
                        <Table.Th>Actualizada</Table.Th>
                        <Table.Th></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {lessons.map((l) => (
                        <Table.Tr key={l.id}>
                          <Table.Td>{l.title}</Table.Td>
                          <Table.Td>{l.description}</Table.Td>
                          <Table.Td>{l.updated_at ? new Date(l.updated_at).toLocaleString('es-ES') : '-'}</Table.Td>
                          <Table.Td width={220}>
                            <Group gap="xs" justify="end">
                              <Button
                                size="xs"
                                variant="light"
                                color="blue"
                                leftSection={<IconExternalLink size={14} />}
                                component={Link}
                                to={`/lecciones/${l.id}`}
                              >
                                Ver
                              </Button>
                              <Button size="xs" variant="light" onClick={() => openEditLesson(l)}>Editar</Button>
                              <Button size="xs" color="red" leftSection={<IconTrash size={14} />} onClick={() => removeLesson(l.id)}>Borrar</Button>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Card>

        {/* Modal para palabras */}
        <Modal opened={wordModalOpened} onClose={() => setWordModalOpened(false)} title={editingWord ? 'Editar palabra' : 'Nueva palabra'} centered>
          <Stack>
            <TextInput
              label="Kanji"
              value={wordForm.kanji}
              onChange={(e) => setWordForm({ ...wordForm, kanji: e.currentTarget.value })}
              required
            />
            <TextInput
              label="Romaji"
              value={wordForm.romaji}
              onChange={(e) => setWordForm({ ...wordForm, romaji: e.currentTarget.value })}
            />
            <TextInput
              label="Traducción"
              value={wordForm.translation}
              onChange={(e) => setWordForm({ ...wordForm, translation: e.currentTarget.value })}
              required
            />
            <Group justify="end">
              <Button onClick={saveWord}>Guardar</Button>
            </Group>
          </Stack>
        </Modal>

        {/* Modal para kanji */}
        <Modal opened={kanjiModalOpened} onClose={() => setKanjiModalOpened(false)} title={editingKanji ? 'Editar kanji' : 'Nuevo kanji'} centered>
          <Stack>
            <TextInput
              label="Kanji"
              value={kanjiForm.kanji}
              onChange={(e) => setKanjiForm({ ...kanjiForm, kanji: e.currentTarget.value })}
              required
              maxLength={50}
            />
            <TextInput
              label="Onyomi (separados por coma)"
              value={kanjiForm.onyomi}
              onChange={(e) => setKanjiForm({ ...kanjiForm, onyomi: e.currentTarget.value })}
              maxLength={255}
            />
            <TextInput
              label="Kunyomi (separados por coma)"
              value={kanjiForm.kunyomi}
              onChange={(e) => setKanjiForm({ ...kanjiForm, kunyomi: e.currentTarget.value })}
              maxLength={255}
            />
            <TextInput
              label="Traducción (separados por coma)"
              value={kanjiForm.translation}
              onChange={(e) => setKanjiForm({ ...kanjiForm, translation: e.currentTarget.value })}
              required
              maxLength={255}
            />
            <Group justify="end">
              <Button onClick={saveKanji}>Guardar</Button>
            </Group>
          </Stack>
        </Modal>

        {/* Modal para importar con OCR */}
        <Modal
          opened={ocrOpened}
          onClose={resetOcrModal}
          title="Importar vocabulario con OCR"
          centered
          size={ocrStep === 'review' ? '80rem' : 'md'}
        >
          {ocrStep === 'upload' ? (
            <Stack>
              <FileInput
                accept="image/*,application/pdf"
                placeholder="Selecciona una imagen o PDF con la hoja de vocabulario"
                value={ocrFile}
                onChange={setOcrFile}
                clearable
              />
              <Text size="xs" c="dimmed">
                El texto se extraerá con el servicio OCR y se estructurará con IA. Podrás revisar las palabras antes de guardarlas.
              </Text>
              <Group justify="end">
                <Button leftSection={<IconPhotoScan size={16} />} loading={ocrLoading} disabled={!ocrFile} onClick={handleOcrExtract}>
                  Analizar imagen
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack>
              <Group justify="space-between">
                <Badge color="grape">{ocrItems.length} palabras detectadas</Badge>
                <Button variant="subtle" size="xs" onClick={() => { setOcrStep('upload'); setOcrItems([]) }}>
                  Volver a elegir archivo
                </Button>
              </Group>
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <Table striped withTableBorder verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={50}></Table.Th>
                      <Table.Th>Kanji</Table.Th>
                      <Table.Th>Romaji</Table.Th>
                      <Table.Th>Traducción</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {ocrItems.map((item, idx) => (
                      <Table.Tr key={idx}>
                        <Table.Td>
                          <Checkbox checked={item.include} onChange={(e) => setOcrItems((prev) => prev.map((it, i) => (i === idx ? { ...it, include: e.currentTarget.checked } : it)))} />
                        </Table.Td>
                        <Table.Td><TextInput size="xs" value={item.kanji} onChange={(e) => updateOcrItem(idx, 'kanji', e.currentTarget.value)} /></Table.Td>
                        <Table.Td><TextInput size="xs" value={item.romaji} onChange={(e) => updateOcrItem(idx, 'romaji', e.currentTarget.value)} /></Table.Td>
                        <Table.Td><TextInput size="xs" value={item.translation} onChange={(e) => updateOcrItem(idx, 'translation', e.currentTarget.value)} /></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
              <Group justify="end">
                <Button loading={ocrSaving} disabled={ocrItems.filter((i) => i.include).length === 0} onClick={saveOcrItems}>
                  Guardar seleccionadas
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>

        {/* Modal editor de lecciones */}
        <Modal
          opened={lessonEditorOpened}
          onClose={() => setLessonEditorOpened(false)}
          title={editingLessonId ? 'Editar lección' : 'Nueva lección'}
          centered
          size="90rem"
        >
          <Stack gap="sm">
            <Group grow align="start">
              <TextInput
                label="Título"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.currentTarget.value)}
                required
              />
              <TextInput
                label="Descripción (opcional)"
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.currentTarget.value)}
              />
            </Group>

            {!editingLessonId && (
              <>
                <FileInput
                  label="Capturas de la lección (imágenes o PDFs)"
                  placeholder="Selecciona una o varias capturas"
                  multiple
                  value={lessonFiles}
                  onChange={setLessonFiles}
                  clearable
                />
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    El contenido se extraerá por OCR y la IA generará una página explicativa completa. Revisa y edita el resultado antes de guardar.
                  </Text>
                  <Button
                    leftSection={<IconPhotoScan size={16} />}
                    loading={lessonGenerating}
                    disabled={!lessonFiles || lessonFiles.length === 0}
                    onClick={generateLessonHtml}
                  >
                    Generar contenido
                  </Button>
                </Group>
              </>
            )}

            {lessonHtml && (
              <>
                <Textarea
                  label="Contenido HTML (editable)"
                  autosize
                  minRows={10}
                  maxRows={18}
                  styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                  value={lessonHtml}
                  onChange={(e) => setLessonHtml(e.currentTarget.value)}
                />
                <iframe
                  title="Previsualización"
                  srcDoc={lessonHtml}
                  style={{ width: '100%', height: 400, border: '1px solid #ddd', borderRadius: 8 }}
                  sandbox=""
                />
              </>
            )}

            <Group justify="end">
              <Button loading={lessonSaving} disabled={!lessonHtml.trim() || !lessonTitle.trim()} onClick={saveLesson}>
                Guardar lección
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Modal para importar */}
        <Modal opened={importOpened} onClose={() => setImportOpened(false)} title="Importar Excel (.xlsx)" centered>
          <Stack>
            <FileInput
              accept=".xlsx"
              placeholder="Selecciona un .xlsx con columnas japanese / pronounciation / translation"
              value={importFile}
              onChange={setImportFile}
              clearable
            />
            <Group justify="end">
              <Button
                leftSection={<IconUpload size={16} />}
                loading={importing}
                disabled={!importFile}
                onClick={handleImport}
              >
                Importar
              </Button>
            </Group>
          </Stack>
        </Modal>
      </AppShell.Main>
    </AppShell>
  )
}
