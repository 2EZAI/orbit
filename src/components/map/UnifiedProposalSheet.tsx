import { IProposal, useProposals } from "~/hooks/useProposals";
import { useTheme } from "../ThemeProvider";
import { Sheet } from "../ui/sheet";
import { useEffect, useState } from "react";
import ProposalSelectList from "./ProposalSelectList";
import ProposalDetail from "./ProposalDetail";

interface IProps {
  show: boolean;
  onClose: () => void;
  onProposalShare: (proposal: IProposal) => void;
}
const UnifiedProposalSheet: React.FC<IProps> = ({
  show,
  onClose,
  onProposalShare,
}) => {
  const { theme } = useTheme();
  const { proposals, getAllProposals, loading } = useProposals();
  const [selectedProposals, setSelectedProposals] = useState<IProposal | null>(
    null
  );
  useEffect(() => {
    if (show) {
      getAllProposals();
    }
  }, [show]);
  return (
    <Sheet
      isOpen={show}
      onClose={onClose}
      expanded={true}
      isScrollable={selectedProposals ? true : false}
    >
      {!selectedProposals ? (
        <ProposalSelectList
          onBack={onClose}
          proposals={proposals}
          onShowEventDetails={(proposal) => setSelectedProposals(proposal)}
        />
      ) : (
        <ProposalDetail
          proposal={selectedProposals}
          onClose={() => setSelectedProposals(null)}
          onProposalShare={onProposalShare}
        />
      )}
    </Sheet>
  );
};
export default UnifiedProposalSheet;
