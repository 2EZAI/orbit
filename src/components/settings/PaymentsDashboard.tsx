import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { useTheme } from "~/src/components/ThemeProvider";
import { useStripe } from "~/hooks/useStripe";
import {
  Wallet,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  RefreshCw,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import { Linking, StyleSheet } from "react-native";

interface PaymentsDashboardProps {
  accountId: string;
}

interface Balance {
  available: Array<{ amount: number; currency: string }>;
  pending: Array<{ amount: number; currency: string }>;
}

interface Transaction {
  id: string;
  type: "charge" | "refund" | "payout";
  amount: number;
  currency: string;
  status: string;
  created: number;
  description?: string;
}

interface TransactionsResponse {
  data: Transaction[];
  has_more: boolean;
  next_cursor?: string;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
  description?: string;
}

interface PayoutsResponse {
  data: Payout[];
  payout_schedule?: {
    interval: string;
    delay_days: number;
    minimum_amount: number;
  };
}

export function PaymentsDashboard({ accountId }: PaymentsDashboardProps) {
  const { theme } = useTheme();
  const {
    getAccountBalance,
    getTransactions,
    getPayouts,
    createAccountManagementLink,
  } = useStripe();

  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutSchedule, setPayoutSchedule] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const formatCurrency = useCallback(
    (amount: number, currency: string = "usd") => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount / 100);
    },
    []
  );

  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      const balanceData = await getAccountBalance(accountId);
      setBalance(balanceData);
    } catch (err: any) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load balance";

      if (errorMessage === "BALANCE_ENDPOINT_NOT_AVAILABLE") {
        return;
      }

      console.error("Failed to load balance:", errorMessage);
    }
  }, [accountId]);

  const loadTransactions = useCallback(
    async (cursor?: string) => {
      setTransactionsLoading(true);
      try {
        const response: TransactionsResponse = await getTransactions(
          accountId,
          {
            limit: 20,
            startingAfter: cursor,
          }
        );

        if (cursor) {
          setTransactions((prev) => [...prev, ...response.data]);
        } else {
          setTransactions(response.data);
        }

        setHasMoreTransactions(response.has_more);
        setNextCursor(response.next_cursor || null);
      } catch (err: any) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load transactions";

        if (errorMessage === "TRANSACTIONS_ENDPOINT_NOT_AVAILABLE") {
          return;
        }

        Toast.show({
          type: "error",
          text1: "Failed to Load Transactions",
          text2: errorMessage,
        });
      } finally {
        setTransactionsLoading(false);
      }
    },
    [accountId]
  );

  const loadPayouts = useCallback(async () => {
    try {
      const response: PayoutsResponse = await getPayouts(accountId, {
        limit: 10,
      });
      setPayouts(response.data);
      setPayoutSchedule(response.payout_schedule);
    } catch (err: any) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load payouts";

      if (errorMessage === "PAYOUTS_ENDPOINT_NOT_AVAILABLE") {
        return;
      }

      console.error("Failed to load payouts:", errorMessage);
    }
  }, [accountId]);

  const loadDashboardData = useCallback(async () => {
    if (hasLoadedRef.current) return; // Prevent multiple simultaneous loads
    hasLoadedRef.current = true;
    setIsLoading(true);
    try {
      await Promise.all([loadBalance(), loadPayouts(), loadTransactions()]);
    } catch (err: any) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load dashboard data";
      Toast.show({
        type: "error",
        text1: "Error",
        text2: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadBalance, loadPayouts, loadTransactions]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    hasLoadedRef.current = false; // Reset flag for refresh
    try {
      await Promise.all([loadBalance(), loadPayouts(), loadTransactions()]);
    } catch (err: any) {
      // Silently fail on refresh
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadBalance, loadPayouts, loadTransactions]);

  const handleOpenAccountManagement = async () => {
    try {
      const managementUrl = await createAccountManagementLink(accountId);
      const canOpen = await Linking.canOpenURL(managementUrl);
      if (canOpen) {
        await Linking.openURL(managementUrl);
      } else {
        throw new Error("Cannot open account management URL");
      }
    } catch (err: any) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to open account management";

      if (
        !errorMessage.toLowerCase().includes("route not found") &&
        !errorMessage.toLowerCase().includes("endpoint not found") &&
        !errorMessage.toLowerCase().includes("not available")
      ) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: errorMessage,
        });
      }
    }
  };

  useEffect(() => {
    if (accountId && !hasLoadedRef.current) {
      hasLoadedRef.current = false; // Reset when accountId changes
      loadDashboardData();
    }
  }, [accountId]); // Only depend on accountId

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={{
            marginTop: 16,
            color: theme.colors.text + "80",
            fontSize: 14,
          }}
        >
          Loading dashboard...
        </Text>
      </View>
    );
  }

  const availableAmount = balance?.available[0]?.amount || 0;
  const pendingAmount = balance?.pending[0]?.amount || 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={{ padding: 16, gap: 16 }}>
        {/* Balance Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: theme.dark ? 1 : 0.5,
              borderColor: theme.colors.border,
            }}
          >
            <View style={styles.walletContainer}>
              <Wallet size={20} color={theme.colors.primary} />
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.text + "80",
                  },
                ]}
              >
                Available Balance
              </Text>
            </View>
            <Text style={[styles.subTitle, { color: theme.colors.text }]}>
              {formatCurrency(availableAmount, balance?.available[0]?.currency)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: theme.colors.text + "60",
              }}
            >
              Ready to payout
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: theme.dark ? 1 : 0.5,
              borderColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <RefreshCw size={20} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.text + "80" }]}>
                Pending Balance
              </Text>
            </View>
            <Text
              style={[
                styles.subTitle,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              {formatCurrency(pendingAmount, balance?.pending[0]?.currency)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: theme.colors.text + "60",
              }}
            >
              In processing
            </Text>
          </View>
        </View>

        {/* Account Management Button */}
        <TouchableOpacity
          onPress={handleOpenAccountManagement}
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: theme.dark ? 1 : 0.5,
            borderColor: theme.colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 4,
              }}
            >
              Account Management
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.text + "80",
              }}
            >
              Manage bank accounts, tax info, and settings
            </Text>
          </View>
          <ExternalLink size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Transactions */}
        <View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: theme.colors.text,
              marginBottom: 12,
            }}
          >
            Recent Transactions
          </Text>

          {transactions.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 16,
                padding: 32,
                alignItems: "center",
                borderWidth: theme.dark ? 1 : 0.5,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "80",
                  textAlign: "center",
                }}
              >
                No transactions yet
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {transactions.slice(0, 5).map((transaction) => (
                <View
                  key={transaction.id}
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: theme.dark ? 1 : 0.5,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.colors.primary + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    {transaction.type === "charge" ? (
                      <ArrowUp size={20} color={theme.colors.primary} />
                    ) : transaction.type === "refund" ? (
                      <RefreshCw size={20} color={theme.colors.notification} />
                    ) : (
                      <ArrowDown size={20} color={theme.colors.text} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.colors.text,
                        marginBottom: 2,
                      }}
                    >
                      {transaction.description || transaction.type}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.colors.text + "60",
                      }}
                    >
                      {formatDate(transaction.created)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color:
                          transaction.type === "charge"
                            ? theme.colors.primary
                            : theme.colors.text,
                      }}
                    >
                      {transaction.type === "charge" ? "+" : "-"}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme.colors.text + "60",
                        marginTop: 2,
                      }}
                    >
                      {transaction.status}
                    </Text>
                  </View>
                </View>
              ))}

              {transactions.length > 5 && (
                <TouchableOpacity
                  onPress={() => loadTransactions(nextCursor || undefined)}
                  disabled={transactionsLoading || !hasMoreTransactions}
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: 12,
                    padding: 16,
                    alignItems: "center",
                    borderWidth: theme.dark ? 1 : 0.5,
                    borderColor: theme.colors.border,
                  }}
                >
                  {transactionsLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.colors.primary,
                      }}
                    >
                      Load More Transactions
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Payout Schedule */}
        {payoutSchedule && (
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: theme.dark ? 1 : 0.5,
              borderColor: theme.colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              Payout Schedule
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.text + "80",
              }}
            >
              {payoutSchedule.interval === "daily"
                ? "Daily payouts"
                : payoutSchedule.interval === "weekly"
                ? "Weekly payouts"
                : "Monthly payouts"}{" "}
              • {payoutSchedule.delay_days} day delay • Minimum{" "}
              {formatCurrency(payoutSchedule.minimum_amount)}
            </Text>
          </View>
        )}

        {/* Recent Payouts */}
        {payouts.length > 0 && (
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: theme.colors.text,
                marginBottom: 12,
              }}
            >
              Recent Payouts
            </Text>
            <View style={{ gap: 8 }}>
              {payouts.map((payout) => (
                <View
                  key={payout.id}
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: theme.dark ? 1 : 0.5,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.colors.text,
                        marginBottom: 2,
                      }}
                    >
                      {formatCurrency(payout.amount, payout.currency)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.colors.text + "60",
                      }}
                    >
                      {formatDate(payout.arrival_date)}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor:
                        payout.status === "paid"
                          ? theme.colors.primary + "20"
                          : theme.colors.text + "20",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color:
                          payout.status === "paid"
                            ? theme.colors.primary
                            : theme.colors.text,
                      }}
                    >
                      {payout.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  subTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  title: {
    marginLeft: 8,
    fontSize: 12,
  },
  walletContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
});
