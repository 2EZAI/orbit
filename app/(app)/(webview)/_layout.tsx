import { Stack } from "expo-router";
import {TouchableOpacity} from "react-native";
import {
  ArrowLeft,
} from "lucide-react-native";
import {Text, Platform} from "react-native";
import { useRouter } from "expo-router";
import { Icon } from 'react-native-elements';

export default function WebviewLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitleAlign: 'center',
          headerTitle: () => (
 <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Book Event</Text>
          ),
           headerLeft: () => (
      <TouchableOpacity style={{ marginLeft: 10 }}
      onPress={() => router.back()}>
        {/* You can use an icon here instead of text */}
         {Platform.OS === 'ios'?
        <ArrowLeft size={24} className="text-foreground" />
        :
          <Icon name="arrow-back" type="material"
                      size={24}
                      color="#239ED0"/>
        }
        
      </TouchableOpacity>
    ),
        }}
      />
    </Stack>
  );
}
