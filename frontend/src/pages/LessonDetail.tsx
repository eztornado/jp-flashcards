import React, { useEffect, useState } from 'react'
import { AppShell, Button, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

type Lesson = { id: number; title: string; description: string; html: string }

export default function LessonDetail() {
  const { id } = useParams()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/lessons/${id}`)
      .then(({ data }) => setLesson(data))
      .catch((e) => setError(e?.response?.status === 404 ? 'Lección no encontrada' : 'Error cargando la lección'))
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
