import { Crown, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UpgradePromptProps {
  feature: string;
  description: string;
  onUpgrade: () => void;
  onDismiss?: () => void;
}

export function UpgradePrompt({ feature, description, onUpgrade, onDismiss }: UpgradePromptProps) {
  return (
    <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Upgrade to Pro</CardTitle>
            <CardDescription>{feature} is a Pro feature</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">{description}</p>
        <div className="flex gap-2">
          <Button onClick={onUpgrade} className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          {onDismiss && (
            <Button variant="outline" onClick={onDismiss}>
              Maybe Later
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface InlineUpgradeProps {
  message: string;
  onUpgrade: () => void;
}

export function InlineUpgrade({ message, onUpgrade }: InlineUpgradeProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
      <Lock className="h-3 w-3 text-yellow-600" />
      <span>{message}</span>
      <button
        onClick={onUpgrade}
        className="ml-auto text-blue-600 hover:text-blue-700 font-medium underline"
      >
        Upgrade
      </button>
    </div>
  );
}
