import 'dart:convert';
import 'dart:io';

import 'package:educ_app/src/catalog.dart';
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
}
