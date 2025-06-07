
import { toast } from "sonner";

export class ToastNotificationService {
  static showCrawlingStarted() {
    toast.info("🕷️ Crawling Started", {
      description: "Discovering and fetching pages...",
      duration: 3000,
    });
  }

  static showCrawlingCompleted() {
    toast.success("✅ Crawling Completed", {
      description: "All pages have been crawled.",
      duration: 3000,
    });
  }

  static showTrainingStarted() {
    toast.info("🧠 Training Started", {
      description: "Initializing training process...",
      duration: 3000,
    });
  }

  static showTrainingCompleted() {
    toast.success("🎉 Training Completed!", {
      description: "Your AI agent is trained and ready to use.",
      duration: 8000,
      style: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: '2px solid #10b981',
        fontSize: '16px',
        fontWeight: '600',
        boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
      },
    });
  }
}
