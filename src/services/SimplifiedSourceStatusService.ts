
export interface SourceStatusSummary {
  totalSources: number;
  hasCrawledSources: boolean;
  hasTrainingSources: boolean;
  allSourcesCompleted: boolean;
  isEmpty: boolean;
}

export interface ButtonState {
  text: string;
  disabled: boolean;
  variant: 'default' | 'secondary';
}

export class SimplifiedSourceStatusService {
  static analyzeSourceStatus(sources: any[]): SourceStatusSummary {
    const totalSources = sources.length;
    const hasCrawledSources = sources.some(s => 
      s.crawl_status === 'completed' || s.crawl_status === 'ready_for_training'
    );
    const hasTrainingSources = sources.some(s => s.requires_manual_training === true);
    const allSourcesCompleted = sources.length > 0 && sources.every(s => 
      s.crawl_status === 'completed' || s.crawl_status === 'training_completed'
    );

    return {
      totalSources,
      hasCrawledSources,
      hasTrainingSources,
      allSourcesCompleted,
      isEmpty: totalSources === 0
    };
  }

  static determineButtonState(summary: SourceStatusSummary): ButtonState {
    if (summary.isEmpty) {
      return {
        text: 'No sources to train',
        disabled: true,
        variant: 'secondary'
      };
    }

    if (summary.hasTrainingSources) {
      return {
        text: 'Start Training',
        disabled: false,
        variant: 'default'
      };
    }

    if (summary.allSourcesCompleted) {
      return {
        text: 'All sources trained',
        disabled: true,
        variant: 'secondary'
      };
    }

    return {
      text: 'Waiting for crawling to complete',
      disabled: true,
      variant: 'secondary'
    };
  }
}
