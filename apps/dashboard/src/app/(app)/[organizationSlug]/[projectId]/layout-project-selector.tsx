'use client';

import { Combobox } from '@/components/ui/combobox';
import { useAppParams } from '@/hooks/useAppParams';
import { usePathname, useRouter } from 'next/navigation';

import type { getProjectsByOrganizationSlug } from '@openpanel/db';

interface LayoutProjectSelectorProps {
  projects: Awaited<ReturnType<typeof getProjectsByOrganizationSlug>>;
}
export default function LayoutProjectSelector({
  projects,
}: LayoutProjectSelectorProps) {
  const router = useRouter();
  const { organizationSlug, projectId } = useAppParams();
  const pathname = usePathname() || '';

  return (
    <div>
      <Combobox
        portal
        align="end"
        className="w-auto min-w-0 max-sm:max-w-[100px]"
        placeholder={'Select project'}
        onChange={(value) => {
          if (organizationSlug && projectId) {
            const split = pathname.replace(projectId, value).split('/');
            // slicing here will remove everything after /{orgId}/{projectId}/dashboards [slice here] /xxx/xxx/xxx
            router.push(split.slice(0, 4).join('/'));
          } else {
            router.push(`/${organizationSlug}/${value}`);
          }
        }}
        value={projectId}
        items={
          projects.map((item) => ({
            label: item.name,
            value: item.id,
          })) ?? []
        }
      />
    </div>
  );
}
