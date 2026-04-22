import type { IconName } from '@/components/ui/icon';
import { Empty } from '@/components/ui/empty';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';

type Props = {
  title: string;
  subtitle: string;
  phase: string;
  icon?: IconName;
};

export function PagePlaceholder({ title, subtitle, phase, icon = 'box' }: Props) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div style={{ padding: 24 }}>
        <Panel padded={false}>
          <Empty
            icon={icon}
            title={`In arrivo nella ${phase}`}
            subtitle="Questa sezione è pianificata nella roadmap del progetto."
          />
        </Panel>
      </div>
    </div>
  );
}
