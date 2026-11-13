import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'models.dart';

/// Catalogue complet chargé depuis assets/catalog.json
/// (généré par `dart run tool/sync_resources.dart`).
class Catalog {
  Catalog._({
    required this.resources,
    required this.levelOrder,
    required Map<String, Palette> levelPalettes,
    required Map<String, Palette> subjectPalettes,
    required Map<String, String> levelIcons,
    required Map<String, String> subjectIcons,
  })  : _levelPalettes = levelPalettes,
        _subjectPalettes = subjectPalettes,
        _levelIcons = levelIcons,
        _subjectIcons = subjectIcons;

  final List<Resource> resources;
  final List<String> levelOrder;
  final Map<String, Palette> _levelPalettes;
  final Map<String, Palette> _subjectPalettes;
  final Map<String, String> _levelIcons;
  final Map<String, String> _subjectIcons;

  static Future<Catalog> load() async {
    final raw = jsonDecode(await rootBundle.loadString('assets/catalog.json')) as Map<String, dynamic>;
    return Catalog.fromJson(raw);
  }

  factory Catalog.fromJson(Map<String, dynamic> raw) {
    final styles = (raw['styles'] as Map<String, dynamic>?) ?? const {};
    final icons = (styles['icons'] as Map<String, dynamic>?) ?? const {};

    Map<String, Palette> palettes(dynamic m) => {
          for (final e in ((m as Map<String, dynamic>?) ?? const {}).entries)
            if (e.value is Map<String, dynamic>) e.key: Palette.fromJson(e.value as Map<String, dynamic>),
        };
    Map<String, String> strings(dynamic m) => {
          for (final e in ((m as Map<String, dynamic>?) ?? const {}).entries)
            if (e.value is String) e.key: e.value as String,
        };

    return Catalog._(
      resources: (raw['resources'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(Resource.fromJson)
          .toList(),
      levelOrder: (raw['ordreNiveaux'] as List? ?? const []).whereType<String>().toList(),
      levelPalettes: palettes(styles['niveaux']),
      subjectPalettes: palettes(styles['matieres']),
      levelIcons: strings(icons['niveaux']),
      subjectIcons: strings(icons['matieres']),
    );
  }

  Palette levelPalette(String? niveau) => _levelPalettes[niveau] ?? Palette.neutral;
  Palette subjectPalette(String? matiere) => _subjectPalettes[matiere] ?? Palette.neutral;
  String levelIcon(String niveau) => _levelIcons[niveau] ?? '📘';
  String subjectIcon(String matiere) => _subjectIcons[matiere] ?? '📘';

  /// Niveaux présents, dans l'ordre de generic_data.json puis alphabétique.
  List<String> get levels {
    final unique = resources.map((r) => r.niveau).toSet();
    final ordered = levelOrder.where(unique.contains).toList();
    final rest = unique.where((n) => !levelOrder.contains(n)).toList()..sort();
    return [...ordered, ...rest];
  }

  /// Cycles non vides, avec un cycle « Autres » pour les niveaux inconnus.
  List<Cycle> get availableCycles {
    final present = levels;
    final known = cycles.expand((c) => c.levels).toSet();
    final list = [
      for (final c in cycles) c.withLevels(present.where(c.levels.contains).toList()),
    ];
    final others = present.where((n) => !known.contains(n)).toList();
    if (others.isNotEmpty) {
      list.add(Cycle(id: 'autres', label: 'Autres', icon: '📦', hint: 'Autres niveaux', levels: others));
    }
    return list.where((c) => c.levels.isNotEmpty).toList();
  }

  int countForLevel(String niveau) => resources.where((r) => r.niveau == niveau).length;

  List<Resource> forLevel(String niveau) => resources.where((r) => r.niveau == niveau).toList();

  /// Matières d'un niveau avec leur nombre de ressources, triées.
  List<MapEntry<String, int>> subjectsFor(String niveau) {
    final counts = <String, int>{};
    for (final r in forLevel(niveau)) {
      counts[r.matiere] = (counts[r.matiere] ?? 0) + 1;
    }
    return counts.entries.toList()..sort((a, b) => a.key.compareTo(b.key));
  }
}

String plural(int n, String word) => '$n $word${n > 1 ? 's' : ''}';
