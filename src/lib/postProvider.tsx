import React, { createContext, useContext, useState } from "react";

type PostRefreshContextType = {
  isRefreshRequired: boolean;
  setRefreshRequired: (value: boolean) => void;
};

const PostRefreshContext = createContext<PostRefreshContextType>({
  isRefreshRequired: false,
  setRefreshRequired: () => {}
});

export const PostRefreshProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isRefreshRequired, setIsRefreshRequired] = useState(false);
  const setRefreshRequired = (value: boolean) => setIsRefreshRequired(value);
  
  return (
    <PostRefreshContext.Provider
      value={{ isRefreshRequired, setRefreshRequired }}
    >
      {children}
    </PostRefreshContext.Provider>
  );
};

export const usePostRefresh = () => useContext(PostRefreshContext);

export default PostRefreshContext;
