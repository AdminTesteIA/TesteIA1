
import CreateAgentHeader from '@/components/CreateAgentHeader';
import AgentForm from '@/components/AgentForm';
import { useCreateAgent } from '@/hooks/useCreateAgent';

export default function CreateAgent() {
  const { createAgent, loading } = useCreateAgent();

  return (
    <div className="space-y-8">
      <CreateAgentHeader />
      <AgentForm onSubmit={createAgent} loading={loading} />
    </div>
  );
}
