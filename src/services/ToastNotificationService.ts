
import { toast } from '@/hooks/use-toast';

export class ToastNotificationService {
  private static shownToasts = new Set<string>();

  static showCrawlingStarted() {
    const toastId = 'crawling-started';
    if (this.shownToasts.has(toastId)) return;
    
    this.shownToasts.add(toastId);
    toast({
      title: "Crawling Started",
      description: "Your website is being crawled for content.",
    });
    
    // Clear after 5 seconds to allow showing again for new crawls
    setTimeout(() => this.shownToasts.delete(toastId), 5000);
  }

  static showCrawlingCompleted() {
    const toastId = 'crawling-completed';
    if (this.shownToasts.has(toastId)) return;
    
    this.shownToasts.add(toastId);
    toast({
      title: "Crawling Completed",
      description: "Website content has been successfully crawled.",
    });
    
    setTimeout(() => this.shownToasts.delete(toastId), 5000);
  }

  static showTrainingStarted() {
    const toastId = 'training-started';
    if (this.shownToasts.has(toastId)) return;
    
    this.shownToasts.add(toastId);
    toast({
      title: "Agent Training Started", 
      description: "Your AI agent is being trained with the crawled content.",
    });
    
    setTimeout(() => this.shownToasts.delete(toastId), 5000);
  }

  static showTrainingCompleted() {
    const toastId = 'training-completed';
    if (this.shownToasts.has(toastId)) return;
    
    this.shownToasts.add(toastId);
    toast({
      title: "Training Completed",
      description: "Your AI agent has been successfully trained and is ready to use.",
    });
    
    setTimeout(() => this.shownToasts.delete(toastId), 5000);
  }

  static clearAllToasts() {
    this.shownToasts.clear();
  }
}
