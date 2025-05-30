import React, { useState } from 'react';
import { View, Button } from 'react-native';
import Dialog from 'react-native-dialog';

export const AlertDialogs = ({isvisible}) => {
  const [visible, setVisible] = useState(isvisible);

  return (
    <View>
      <Dialog.Container visible={visible}>
        <Dialog.Title>Dialog Title</Dialog.Title>
        <Dialog.Description>This is a simple dialog</Dialog.Description>
        <Dialog.Button label="Cancel" onPress={() => setVisible(false)} />
        <Dialog.Button label="OK" onPress={() => setVisible(false)} />
      </Dialog.Container>
    </View>
  );
};

