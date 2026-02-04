import React from "react";
import { Banner, BlockStack, Button } from "@shopify/polaris";

type Props = {
  title: string;
  suggestion?: string;
  children: React.ReactNode;
};

type State = { hasError: boolean };

export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("SectionErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Banner tone="critical" title={this.props.title}>
          <BlockStack gap="200">
            {this.props.suggestion && <div>{this.props.suggestion}</div>}
            <Button onClick={() => this.setState({ hasError: false })}>Try again</Button>
          </BlockStack>
        </Banner>
      );
    }
    return this.props.children;
  }
}