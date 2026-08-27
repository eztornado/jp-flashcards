import React, { useEffect, useState } from 'react'
import { AppShell, Button, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { Link, useParams } from 'react-router-dom'

type Lesson = { id: number; title: string; description: string; html: string }
const API = 'http://rpi2.netbird.vpn:3000'

export default function LessonDetail() {
  const { id } = useParams()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/api/lessons/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Lección no encontrada')
        return r.json()
      })
      .then(setLesson)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Group px="md" h="100%" align="center" justify="space-between">
          <Title order={4}>{lesson?.title ?? 'Lección'}</Title>
          <Group>
            <Button component={Link} to="/lecciones" variant="light">Lecciones</Button>
            <Button component={Link} to="/">Volver</Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {loading && (
          <Stack align="center" py="xl">
            <Loader />
            <Text c="dimmed">Cargando lección...</Text>
          </Stack>
        )}
        {!loading && error && (
          <Text c="red" ta="center" py="xl">{error}</Text>
        )}
        {!loading && !error && lesson && (
          <>
            {lesson.description && (
              <Text c="dimmed" ta="center" pt="xs">{lesson.description}</Text>
            )}
            {/* El HTML generado es un documento completo con estilos propios:
                se renderiza aislado en un iframe */}
            <iframe
              title={lesson.title}
              srcDoc={lesson.html}
              style={{ width: '100%', height: 'calc(100vh - 70px)', border: 'none' }}
              sandbox=""
            />
          </>
        )}
      </AppShell.Main>
    </AppShell>
  )
}
