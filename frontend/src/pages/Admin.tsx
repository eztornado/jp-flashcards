import React, { useEffect, useState } from 'react'
import { AppShell, Button, Card, Group, Modal, Stack, Table, TextInput, Title, Pagination, FileInput, Tabs } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash, IconUpload } from '@tabler/icons-react'
import { Link } from 'react-router-dom'


type Word = { id: number; kanji: string; romaji?: string; translation: string }
type Kanji = { id: number; kanji: string; onyomi?: string; kunyomi?: string; translation: string }

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'vocabulario' | 'kanji'>('vocabulario')

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

  // Funciones para vocabulario
  async function loadWords() {
    const params = new URLSearchParams({
      page: String(wordsPage),
      pageSize: String(wordsPageSize),
      search: wordsSearch
    })
    const res = await fetch('http://rpi2.netbird.vpn:3000/api/words?' + params.toString())
    const data = await res.json()
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
    const method = editingWord ? 'PUT' : 'POST'
    const url = editingWord
      ? 'http://rpi2.netbird.vpn:3000/api/words/' + editingWord.id
      : 'http://rpi2.netbird.vpn:3000/api/words'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wordForm)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      notifications.show({ color: 'red', title: 'Error', message: JSON.stringify(err) })
      return
    }
    setWordModalOpened(false)
    notifications.show({ color: 'teal', title: 'Guardado', message: 'Palabra guardada' })
    loadWords()
  }

  async function removeWord(id: number) {
    if (!confirm('¿Eliminar esta palabra?')) return
    const res = await fetch('http://rpi2.netbird.vpn:3000/api/words/' + id, { method: 'DELETE' })
    if (res.ok) {
      notifications.show({ color: 'teal', title: 'Eliminada', message: 'Palabra eliminada' })
      loadWords()
    }
  }

  // Funciones para kanji
  async function loadKanjis() {
    const params = new URLSearchParams({
      page: String(kanjiPage),
      pageSize: String(kanjiPageSize),
      search: kanjiSearch
    })
    const res = await fetch('http://rpi2.netbird.vpn:3000/api/kanji?' + params.toString())
    const data = await res.json()
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
    const method = editingKanji ? 'PUT' : 'POST'
    const url = editingKanji
      ? 'http://rpi2.netbird.vpn:3000/api/kanji/' + editingKanji.id
      : 'http://rpi2.netbird.vpn:3000/api/kanji'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kanjiForm)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      notifications.show({ color: 'red', title: 'Error', message: JSON.stringify(err) })
      return
    }
    setKanjiModalOpened(false)
    notifications.show({ color: 'teal', title: 'Guardado', message: 'Kanji guardado' })
    loadKanjis()
  }

  async function removeKanji(id: number) {
    if (!confirm('¿Eliminar este kanji?')) return
    const res = await fetch('http://rpi2.netbird.vpn:3000/api/kanji/' + id, { method: 'DELETE' })
    if (res.ok) {
      notifications.show({ color: 'teal', title: 'Eliminado', message: 'Kanji eliminado' })
      loadKanjis()
    }
  }

  // Función para importar
  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const res = await fetch('http://rpi2.netbird.vpn:3000/api/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        notifications.show({ color: 'red', title: 'Error al importar', message: data?.error || 'Error desconocido' })
      } else {
        notifications.show({
          color: 'teal',
          title: 'Importación completada',
          message: `Hoja: ${data.sheet} • Filas: ${data.totalRows} • Insertadas: ${data.inserted} • Actualizadas: ${data.updated} • Omitidas: ${data.skipped}`
        })
        setImportOpened(false)
        setImportFile(null)
        loadWords()
      }
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e?.message || 'Fallo subiendo el archivo' })
    } finally {
      setImporting(false)
    }
  }

  // Función para limpiar BD
  async function clearDatabase(type: 'words' | 'kanji') {
    const confirmMsg = type === 'words'
      ? '⚠️ Esto eliminará TODAS las palabras de vocabulario. ¿Seguro que quieres continuar?'
      : '⚠️ Esto eliminará TODOS los kanji. ¿Seguro que quieres continuar?'

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`http://rpi2.netbird.vpn:3000/api/${type}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifications.show({ color: 'red', title: 'Error al limpiar', message: data?.error || 'Error desconocido' });
        return;
      }
      notifications.show({
        color: 'teal',
        title: 'Base de datos limpiada',
        message: `Se eliminaron ${data.deleted ?? 0} registros`
      });
      if (type === 'words') {
        setWordsPage(1);
        loadWords();
      } else {
        setKanjiPage(1);
        loadKanjis();
      }
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e?.message || 'No se pudo limpiar la BD' });
    }
  }
  async function load() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
    const res = await fetch('http://rpi2.netbird.vpn:3000/api/words?' + params.toString())
    const data = await res.json()
    setItems(data.items)
    setTotal(data.total)
  }

  useEffect(() => { load() }, [page, search])

  function openNew() {
    setEditing(null)
    setForm({ kanji: '', romaji: '', translation: '' })
    setOpened(true)
  }
  function openEdit(w: Word) {
    setEditing(w)
    setForm({ kanji: w.kanji, romaji: w.romaji ?? '', translation: w.translation })
    setOpened(true)
  }
  async function save() {
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? 'http://rpi2.netbird.vpn:3000/api/words/' + editing.id : '/api/words'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      notifications.show({ color: 'red', title: 'Error', message: JSON.stringify(err) })
      return
    }
    setOpened(false)
    notifications.show({ color: 'teal', title: 'Guardado', message: 'Palabra guardada' })
    load()
  }
  async function remove(id: number) {
    if (!confirm('¿Eliminar esta palabra?')) return
    const res = await fetch('http://rpi2.netbird.vpn:3000/api/words/' + id, { method: 'DELETE' })
    if (res.ok) {
      notifications.show({ color: 'teal', title: 'Eliminada', message: 'Palabra eliminada' })
      load()
    }
  }

  const rows = items.map((w) => (
    <Table.Tr key={w.id} onDoubleClick={() => openEdit(w)}>
      <Table.Td>{w.kanji}</Table.Td>
      <Table.Td>{w.romaji}</Table.Td>
      <Table.Td>{w.translation}</Table.Td>
      <Table.Td width={120}>
        <Group gap="xs" justify="end">
          <Button size="xs" variant="light" onClick={() => openEdit(w)}>Editar</Button>
          <Button size="xs" color="red" leftSection={<IconTrash size={14} />} onClick={() => remove(w.id)}>Borrar</Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ))

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
          <Tabs value={activeTab} onChange={(v) => setActiveTab(v as 'vocabulario' | 'kanji')}>
            <Tabs.List>
              <Tabs.Tab value="vocabulario">Vocabulario</Tabs.Tab>
              <Tabs.Tab value="kanji">Kanji</Tabs.Tab>
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
