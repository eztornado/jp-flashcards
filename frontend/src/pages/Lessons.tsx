import React, { useEffect, useState } from 'react'
import { AppShell, Button, Card, Grid, Group, Stack, Text, Title, Badge } from '@mantine/core'
import { IconBook2 } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

type Lesson = { id: number; title: string; description: string; created_at?: string; updated_at?: string }

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/lessons')
      .then(({ data }) => setLessons(data))
      .catch(() => setLessons([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Group px="md" h="100%" align="center" justify="space-between">
          <Group>
            <IconBook2 size={22} />
            <Title order={4}>Lecciones</Title>
          </Group>
          <Button component={Link} to="/">Volver</Button>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Stack p="md" gap="md">
          {loading && <Text c="dimmed">Cargando lecciones...</Text>}
          {!loading && lessons.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              Todavía no hay lecciones disponibles
            </Text>
          )}
          <Grid>
            {lessons.map((l) => (
              <Grid.Col key={l.id} span={{ base: 12, sm: 6, md: 4 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                  <Stack gap="xs" h="100%" justify="space-between">
                    <Stack gap="xs">
                      <Title order={5}>{l.title}</Title>
                      {l.description && (
                        <Text size="sm" c="dimmed">{l.description}</Text>
                      )}
                      {l.updated_at && (
                        <Badge variant="light" color="gray" w="fit-content">
                          Actualizada: {new Date(l.updated_at).toLocaleDateString('es-ES')}
                        </Badge>
                      )}
                    </Stack>
                    <Button component={Link} to={`/lecciones/${l.id}`} variant="light" color="blue" fullWidth mt="xs">
                      Abrir lección
                    </Button>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      </AppShell.Main>
    </AppShell>
  )
}
