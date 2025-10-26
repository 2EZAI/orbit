import React, { useEffect, useState } from "react";
import { useProposals } from "~/hooks/useProposals";
import { Sheet } from "../ui/sheet";
import AddProposalContent from "./AddProposalContent";
import ProposalSelectList from "./ProposalSelectList";
import ShareContent from "./ShareContent";
import ProposalDetail from "./ProposalDetail";
import { UnifiedData } from "./UnifiedDetailsSheet";
import { IProposal } from "~/hooks/useProposals";
interface IProps {
  onClose: () => void;
  isOpen: boolean;
  data: UnifiedData | undefined;
  isEventType?: boolean;
  onProposalShare: (proposal: IProposal) => void;
  onEventShare: (event: UnifiedData) => void;
}
type UIType = "share" | "add-proposal" | "view-proposals" | "proposal-detail";
const UnifiedShareSheet: React.FC<IProps> = ({
  onClose,
  isOpen,
  data,
  isEventType,
  onProposalShare,
  onEventShare,
}) => {
  const { proposals, getAllProposals } = useProposals();
  const [uiType, setUiType] = useState<UIType>("share");
  const [selectedProposal, setSelectedProposal] = useState<IProposal | null>(
    null
  );

  useEffect(() => {
    getAllProposals();
  }, [uiType]);
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      expanded={uiType !== "share"}
      isScrollable={uiType === "proposal-detail"}
    >
      {uiType === "share" ? (
        <ShareContent
          onClose={onClose}
          data={data}
          onEventShare={onEventShare}
          isEventType={isEventType}
          onChangeType={(type: UIType) => {
            if (type === "add-proposal" && proposals.length > 0) {
              // If there are existing proposals, we can add a new one
              setUiType("view-proposals");
            } else {
              setUiType("add-proposal");
            }
          }}
        />
      ) : uiType === "add-proposal" ? (
        <AddProposalContent
          onBack={() => {
            if (proposals.length > 0) {
              setUiType("view-proposals");
            } else {
              setUiType("share");
            }
          }}
          data={data}
        />
      ) : uiType === "proposal-detail" ? (
        <ProposalDetail
          proposal={selectedProposal!}
          onClose={() => {
            setSelectedProposal(null);
            setUiType("share");
          }}
          onProposalShare={onProposalShare}
        />
      ) : (
        <ProposalSelectList
          data={data}
          onBack={() => setUiType("share")}
          proposals={proposals}
          onAdd={() => {
            setUiType("add-proposal");
          }}
          onShowProposalDetail={(proposal) => {
            setSelectedProposal(proposal);
            setUiType("proposal-detail");
          }}
        />
      )}
    </Sheet>
  );
};
export default UnifiedShareSheet;
