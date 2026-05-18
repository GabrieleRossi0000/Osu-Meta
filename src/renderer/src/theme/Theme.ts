import { createTheme, DEFAULT_THEME, MantineColorsTuple, mergeMantineTheme } from '@mantine/core'

const blue: MantineColorsTuple = [
  '#e0fbff',
  '#cbf2ff',
  '#9ae2ff',
  '#64d2ff',
  '#3cc5fe',
  '#23bcfe',
  '#09b8ff',
  '#00a1e4',
  '#0090cd',
  '#007cb5'
]

const green: MantineColorsTuple = [
  '#e5feee',
  '#d2f9e0',
  '#a8f1c0',
  '#7aea9f',
  '#53e383',
  '#3bdf70',
  '#2bdd66',
  '#1ac455',
  '#0caf49',
  '#00963c'
]

const orange: MantineColorsTuple = [
  '#fff8e1',
  '#ffefcc',
  '#ffdd9b',
  '#ffca64',
  '#ffba38',
  '#ffb01b',
  '#ffab09',
  '#e39500',
  '#ca8500',
  '#af7100'
]

const dark: MantineColorsTuple = [
  '#c5cad3',
  '#a3adbd',
  '#8695ab',
  '#424D61',
  '#353F52',
  '#283243',
  '#212B39',
  '#1E2734',
  '#161D28',
  '#0D121A'
] as const

const primary: MantineColorsTuple = [
  '#e1f8ff',
  '#cbedff',
  '#99ccff',
  '#64c1ff',
  '#3aaefe',
  '#20a2fe',
  '#099cff',
  '#0088e4',
  '#0079cd',
  '#0068b6'
] as const

const themeOverride = createTheme({
  fontFamily: 'Nunito, sans-serif',
  headings: {
    fontFamily: 'Nunito, sans-serif'
  },
  defaultRadius: 'lg',
  spacing: {
    xs: '0.25em',
    sm: '0.5em',
    md: '1em',
    lg: '2em',
    xl: '4em'
  },
  colors: {
    blue,
    green,
    orange,
    dark,
    primary
  },
  components: {
    NavLink: {
      styles: {
        root: {
          transition: 'all 0.1s ease',
          '&:hover': {
            transform: 'translateY(-2px)'
          }
        }
      }
    },
    Button: {
      defaultProps: {
        radius: 'md'
      },
      styles: {
        root: {
          transition:
            'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease, background-color 150ms ease',
          '&:hover:not(:disabled)': {
            transform: 'translateY(-1px)'
          },
          '&:active:not(:disabled)': {
            transform: 'translateY(0)'
          }
        }
      }
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md'
      },
      styles: {
        root: {
          transition:
            'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 150ms ease',
          '&:hover:not(:disabled)': {
            transform: 'translateY(-1px)'
          }
        }
      }
    },
    Badge: {
      styles: {
        root: {
          transition: 'all 0.1s ease'
        }
      }
    },
    AppShell: {
      styles: {
        navbar: { border: 'none' },
        header: { border: 'none' },
        main: { border: 'none' }
      }
    },
    Modal: {
      defaultProps: {
        radius: 'xl',
        centered: true,
        zIndex: 2100,
        overlayProps: { backgroundOpacity: 0.35, blur: 14 },
        transitionProps: {
          transition: 'pop',
          duration: 280,
          timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
        }
      },
      classNames: {
        inner: 'mv-modal-inner',
        overlay: 'mv-modal-overlay',
        content: 'mv-modal-content',
        header: 'mv-modal-header',
        title: 'mv-modal-title',
        body: 'mv-modal-body'
      },
      styles: {
        title: {
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 700,
          fontSize: 'var(--mantine-font-size-lg)',
          letterSpacing: '-0.02em'
        }
      }
    },
    Paper: {
      defaultProps: {
        radius: 'lg'
      }
    },
    TextInput: {
      defaultProps: {
        radius: 'lg'
      },
      styles: {
        input: {
          transition:
            'border-color 180ms ease, box-shadow 180ms ease, background-color 150ms ease',
          '&:focus': {
            borderColor: 'var(--mantine-color-primary-5)',
            boxShadow: '0 0 0 3px color-mix(in srgb, var(--mantine-color-primary-5) 22%, transparent)'
          }
        }
      }
    },
    Textarea: {
      defaultProps: {
        radius: 'lg'
      },
      styles: {
        input: {
          transition:
            'border-color 180ms ease, box-shadow 180ms ease, background-color 150ms ease',
          '&:focus': {
            borderColor: 'var(--mantine-color-primary-5)',
            boxShadow: '0 0 0 3px color-mix(in srgb, var(--mantine-color-primary-5) 22%, transparent)'
          }
        }
      }
    },
    Alert: {
      defaultProps: {
        radius: 'lg'
      },
      styles: {
        root: {
          border: 'none',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.12)'
        }
      }
    },
    Collapse: {
      defaultProps: {
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    },
    Title: {
      styles: {
        root: {
          fontFamily: 'Nunito, sans-serif'
        }
      }
    },
    Tooltip: {
      defaultProps: {
        withArrow: true
      },
      styles: {
        tooltip: {
          textAlign: 'center'
        }
      }
    },
    ScrollArea: {
      styles: {
        thumb: {
          backgroundColor: 'var(--mantine-color-primary-2)'
        },
        scrollbar: {
          '&:hover > .mantineScrollAreaThumb': {
            backgroundColor: 'var(--mantine-color-primary-3)'
          }
        }
      }
    }
  }
})

export const theme = mergeMantineTheme(DEFAULT_THEME, themeOverride)
