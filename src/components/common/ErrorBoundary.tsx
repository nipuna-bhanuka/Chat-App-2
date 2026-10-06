import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './ErrorState'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorState
          title="This page failed to render"
          message="Please refresh the page and try again."
        />
      )
    }

    return this.props.children
  }
}
