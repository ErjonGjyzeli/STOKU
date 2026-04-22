import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Questa sezione è pianificata nella roadmap del progetto.
      </CardContent>
    </Card>
  );
}
