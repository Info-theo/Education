import 'dart:convert';
import 'dart:io';

import 'package:educ_app/src/catalog.dart';
import 'package:educ_app/src/models.dart';
import 'package:educ_app/src/screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  late Catalog catalog;

  setUpAll(() {
    final raw = jsonDecode(File('assets/catalog.json').readAsStringSync()) as Map<String, dynamic>;
    catalog = Catalog.fromJson(raw);
  });

  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('le catalogue regroupe les niveaux en cycles', () {
    expect(catalog.resources, isNotEmpty);
    final ids = catalog.availableCycles.map((c) => c.id).toList();
    expect(ids, containsAll(['primaire', 'college', 'lycee']));
    expect(catalog.availableCycles.firstWhere((c) => c.id == 'college').levels, contains('4ème'));
  });

  testWidgets('parcours guidé : cycle → niveau → matière → ressources', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(MaterialApp(home: LevelsScreen(catalog: catalog)));
    expect(find.text('Tu es en quelle classe ?'), findsOneWidget);

    await tester.tap(find.text('Collège'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('4ème'));
    await tester.pumpAndSettle();
    expect(find.text('Choisis ta matière'), findsOneWidget);

    await tester.tap(find.text('SVT'));
    await tester.pumpAndSettle();
    expect(find.textContaining('pour toi'), findsOneWidget);
    expect(find.text('Regarder'), findsWidgets);
  });

  test('chaque ressource a une nature, et des cours complets existent', () {
    expect(catalog.resources.where((r) => r.nature == Category.cours), isNotEmpty);
    expect(catalog.resources.where((r) => r.nature == Category.exercices), isNotEmpty);
    final video = catalog.resources.firstWhere((r) => r.kind == ResourceKind.video);
    expect(video.matches(Category.video), isTrue);
  });

  testWidgets('filtre « Cours complets » en 3ème · Mathématiques', (tester) async {
    tester.view.physicalSize = const Size(1200, 3000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(MaterialApp(
      home: ResourcesScreen(catalog: catalog, niveau: '3ème', matiere: 'Mathématiques'),
    ));
    await tester.pumpAndSettle();
    final total = catalog.forLevel('3ème').where((r) => r.matiere == 'Mathématiques').length;
    final cours = catalog
        .forLevel('3ème')
        .where((r) => r.matiere == 'Mathématiques' && r.nature == Category.cours)
        .length;
    expect(find.text('${plural(total, 'ressource')} pour toi'), findsOneWidget);

    await tester.tap(find.textContaining('Cours complets'));
    await tester.pumpAndSettle();
    expect(find.text('$cours · Cours complets'), findsOneWidget);
    expect(find.text('📚 Cours complet'), findsNWidgets(cours));
  });
}
