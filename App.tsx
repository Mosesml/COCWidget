import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Text style={styles.eyebrow}>COCWIDGET</Text>
      <Text style={styles.title}>Your village. One step ahead.</Text>
      <Text style={styles.copy}>A companion for the way you play.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8F2', padding: 32, justifyContent: 'center' },
  eyebrow: { color: '#607449', fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  title: { color: '#233022', fontSize: 40, fontWeight: '700', marginVertical: 16 },
  copy: { color: '#6B7266', fontSize: 16 },
});
