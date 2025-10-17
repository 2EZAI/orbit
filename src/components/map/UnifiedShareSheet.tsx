import {
  Modal,
  View,
  Text,
  Share,
  TouchableOpacity,
  FlatList,
} from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useTheme } from "../ThemeProvider";
import { UnifiedData } from "./UnifiedDetailsSheet";
import { haptics } from "~/src/lib/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet } from "../ui/sheet";
import React, { useEffect, useState } from "react";
import ShareContent from "./ShareContent";
import { title } from "process";
import AddProposalContent from "./AddProposalContent";
import { useProposals } from "~/hooks/useProposals";
import { get } from "lodash";
import ProposalSelectList from "./ProposalSelectList";
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
