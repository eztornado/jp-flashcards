import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core'
import { IconMoonStars, IconSun } from '@tabler/icons-react'

export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Tooltip label={isDark ? 'Usar modo claro' : 'Usar modo oscuro'}>
      <ActionIcon
        aria-label={isDark ? 'Usar modo claro' : 'Usar modo oscuro'}
        className="color-scheme-toggle"
        variant="default"
        size="lg"
        radius="xl"
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
      >
        {isDark ? <IconSun size={19} /> : <IconMoonStars size={19} />}
      </ActionIcon>
    </Tooltip>
  )
}
