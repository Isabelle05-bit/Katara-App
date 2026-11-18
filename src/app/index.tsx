import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

// Tela temporária só para CONFERIR o banco. Pode apagar depois da fatia 0.
export default function Index() {
  const db = useSQLiteContext();
  const [tabelas, setTabelas] = useState<string[]>([]);
  const [versao, setVersao] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const lista = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      );
      setTabelas(lista.map((t) => t.name));

      const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      setVersao(v?.user_version ?? null);

      const fk = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
      console.log('foreign_keys =', fk?.foreign_keys); // tem que ser 1
    })();
  }, [db]);

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 64 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
        Banco na versão {versao} — {tabelas.length} tabelas
      </Text>
      {tabelas.map((t) => (
        <Text key={t}>• {t}</Text>
      ))}
    </View>
  );
}
