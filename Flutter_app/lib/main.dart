import 'package:flutter/material.dart';

import 'src/catalog.dart';
import 'src/screens.dart';
import 'src/widgets.dart';

void main() {
  runApp(const EducApp());
}

class EducApp extends StatelessWidget {
  const EducApp({super.key});

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFF4B6BFF);
    return MaterialApp(
      title: 'Ressources pédagogiques',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: accent).copyWith(primary: accent),
        scaffoldBackgroundColor: const Color(0xFFEEF5FF),
      ),
      home: const _CatalogLoader(),
    );
  }
}

/// Charge assets/catalog.json puis affiche l'étape 1.
class _CatalogLoader extends StatefulWidget {
  const _CatalogLoader();

  @override
  State<_CatalogLoader> createState() => _CatalogLoaderState();
}

class _CatalogLoaderState extends State<_CatalogLoader> {
  late final Future<Catalog> _future = Catalog.load();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Catalog>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Impossible de charger les ressources.\n'
                  'Depuis la racine du dépôt, lance « node tools/build-catalog.mjs » puis relance l’application.\n\n'
                  '${snapshot.error}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: ink),
                ),
              ),
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        return LevelsScreen(catalog: snapshot.data!);
      },
    );
  }
}
