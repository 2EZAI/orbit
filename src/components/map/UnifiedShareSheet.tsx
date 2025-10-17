import React, { useEffect, useState } from "react";
import { useProposals } from "~/hooks/useProposals";
import { Sheet } from "../ui/sheet";
import AddProposalContent from "./AddProposalContent";
import ProposalSelectList from "./ProposalSelectList";
import ShareContent from "./ShareContent";
import { UnifiedData } from "./UnifiedDetailsSheet";
interface IProps {
  onClose: () => void;
  isOpen: boolean;
  data: UnifiedData | undefined;
  isEventType?: boolean;
}
type UIType = "share" | "add-proposal" | "view-proposals";
const UnifiedShareSheet: React.FC<IProps> = ({
  onClose,
  isOpen,
  data,
  isEventType,
}) => {
  const { proposals, getAllProposals } = useProposals();
  const [uiType, setUiType] = useState<UIType>("share");
  console.log("UnifiedShareSheet data:", proposals);
  useEffect(() => {
    getAllProposals();
  }, [uiType]);
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      expanded={uiType !== "share"}
      isScrollable={false}
    >
      {uiType === "share" ? (
        <ShareContent
          onClose={onClose}
          data={data}
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
      ) : (
        <ProposalSelectList
          data={data}
          onBack={() => setUiType("share")}
          proposals={proposals}
          onAdd={() => {
            setUiType("add-proposal");
          }}
        />
      )}
    </Sheet>
  );
};
export default UnifiedShareSheet;
