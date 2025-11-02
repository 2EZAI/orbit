import { useTheme } from "../ThemeProvider";
import { Text, View } from "react-native";
const EventCategoriesSection = ({ categories }: { categories: any[] }) => {
  const { theme, isDarkMode } = useTheme();
  const getCategoryName = (categoryName?: string) => {
    if (!categoryName) return null;
    if (
      categoryName.toLowerCase().includes("googleapi") ||
      categoryName.toLowerCase().includes("google_api") ||
      categoryName.toLowerCase() === "api"
    ) {
      return null;
    }
    return categoryName;
  };
  return (
    <View className="mb-6">
      <Text
        className="mb-3 text-lg font-bold"
        style={{ color: theme.colors.text }}
      >
        Activity Categories
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {categories
          .filter((category: any) => getCategoryName(category.name))
          .map((category: any, index: number) => (
            <View
              key={`${category.id}-${index}`}
              className="px-4 py-2 rounded-full"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgb(237, 233, 254)",
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{
                  color: isDarkMode ? "#A78BFA" : "#6B46C1",
                }}
              >
                {getCategoryName(category.name)}
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
};
export default EventCategoriesSection;
