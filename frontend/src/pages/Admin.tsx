import React, { useEffect, useState } from 'react'
import { AppShell, Button, Card, Group, Modal, Stack, Table, TextInput, Title, Pagination, FileInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash, IconUpload } from '@tabler/icons-react'
import { Link } from 'react-router-dom'


type Word = { id: number; kanji: string; romaji?: string; translation: string }

export default function Admin() {
  const [items, setItems] = useState<Word[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')

  const [opened, setOpened] = useState(false)
  const [editing, setEditing] = useState<Word | null>(null)

  const [importOpened, setImportOpened] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)


  const [form, setForm] = useState({ kanji: '', romaji: '', translation: '' })

  async function load() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
    const res = await fetch('http://rpi4.netbird.vpn:3000/api/words?' + params.toString())
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
    const url = editing ? 'http://rpi4.netbird.vpn:3000/api/words/' + editing.id : '/api/words'
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
    const res = await fetch('http://rpi4.netbird.vpn:3000/api/words/' + id, { method: 'DELETE' })
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
            <Button leftSection={<IconUpload size={16} />} variant="outline" onClick={() => setImportOpened(true)}>
              Importar Excel
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openNew}>Nueva</Button>
            <Button
                color="red"
                variant="light"
                leftSection={<IconTrash size={16} />}
                onClick={async () => {
                  if (!confirm("⚠️ Esto eliminará TODAS las palabras. ¿Seguro que quieres continuar?")) return;
                  try {
                    const res = await fetch('/api/words', { method: 'DELETE' });
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
                    setPage(1);
                    load();
                  } catch (e: any) {
                    notifications.show({ color: 'red', title: 'Error', message: e?.message || 'No se pudo limpiar la BD' });
                  }
                }}
            >
              Limpiar BD
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Card withBorder radius="md" p="md" m="md">
          <Group justify="space-between" mb="sm">
            <TextInput
              placeholder="Buscar..."
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.currentTarget.value) }}
            />
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
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
          <Group justify="center" mt="md">
            <Pagination total={Math.max(1, Math.ceil(total / pageSize))} value={page} onChange={setPage} />
          </Group>
        </Card>

        <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Editar palabra' : 'Nueva palabra'} centered>
          <Stack>
            <TextInput
              label="Kanji"
              value={form.kanji}
              onChange={(e) => setForm({ ...form, kanji: e.currentTarget.value })}
              required
            />
            <TextInput
              label="Romaji"
              value={form.romaji}
              onChange={(e) => setForm({ ...form, romaji: e.currentTarget.value })}
            />
            <TextInput
              label="Traducción"
              value={form.translation}
              onChange={(e) => setForm({ ...form, translation: e.currentTarget.value })}
              required
            />
            <Group justify="end">
              <Button onClick={save}>Guardar</Button>
            </Group>
          </Stack>
        </Modal>

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
                  onClick={async () => {
                    if (!importFile) return
                    setImporting(true)
                    try {
                      const fd = new FormData()
                      fd.append('file', importFile)
                      const res = await fetch('/api/import', { method: 'POST', body: fd })
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
                        // refresca la lista
                        load()
                      }
                    } catch (e: any) {
                      notifications.show({ color: 'red', title: 'Error', message: e?.message || 'Fallo subiendo el archivo' })
                    } finally {
                      setImporting(false)
                    }
                  }}
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
