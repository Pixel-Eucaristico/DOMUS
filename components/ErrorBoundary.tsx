import React, { Component, ComponentType, PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorFallback, ErrorFallbackProps } from "@/components/ErrorFallback";
import { reportCrashToFirebase } from "@/src/modules/analytics/infrastructure/AnalyticsService";

// Clear persisted tour state so a crash doesn't cause an infinite reload loop
// (DemoModeProvider resumes the tour from AsyncStorage on every app start)
function clearTourStateOnCrash() {
  AsyncStorage.removeItem("domus_tour_step_v1").catch(() => {});
  AsyncStorage.removeItem("domus_tour_minimized_v1").catch(() => {});
}

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null };

/**
 * This is a special case for for using the class components. Error boundaries must be class components because React only provides error boundary functionality through lifecycle methods (componentDidCatch and getDerivedStateFromError) which are not available in functional components.
 * https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static defaultProps: {
    FallbackComponent: ComponentType<ErrorFallbackProps>;
  } = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // Reporta ao Crashlytics (respeitando consentimento do usuario)
    reportCrashToFirebase(error, info.componentStack);

    // Limpa o estado do tour para evitar loop de crash ao recarregar o app
    clearTourStateOnCrash();

    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent } = this.props;

    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
      />
    ) : (
      this.props.children
    );
  }
}
