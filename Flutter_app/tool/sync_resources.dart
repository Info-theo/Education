// Génère assets/catalog.json à partir du dossier partagé ../Resources.
//
// Usage (depuis Flutter_app/) :
//   dart run tool/sync_resources.dart [chemin/vers/Resources]
//
// Reproduit la logique de chargement de l'app React (EducReact_app/lib/data.ts) :
// - parcourt récursivement les fichiers cours*.json ;
// - déduit niveau et matière du chemin (Niveau/Matière/cours.json) ;
// - "chapitre" peut être une chaîne ou une liste de sous-liens ;
// - lit generic_data.json (ordre des niveaux, palettes, icônes).
import 'dart:convert';
import 'dart:io';

final _coursFile = RegExp(r'^cours.*\.json$', caseSensitive: false);

void main(List<String> args) {
  final scriptDir = File.fromUri(Platform.script).parent;
  final projectDir = scriptDir.parent;
  final resourcesDir = Directory(
    args.isNotEmpty ? args.first : '${projectDir.path}/../Resources',
  ).absolute;

  if (!resourcesDir.existsSync()) {
    stderr.writeln('Dossier introuvable : ${resourcesDir.path}');
    exit(1);
  }

  final resources = <Map<String, dynamic>>[];
  final errors = <String>[];

  final files = resourcesDir
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => _coursFile.hasMatch(f.uri.pathSegments.last))
      .toList()
    ..sort((a, b) => a.path.compareTo(b.path));

  for (final file in files) {
    final relative = file.absolute.path
        .substring(resourcesDir.path.length + 1)
        .replaceAll(r'\', '/');
    final parts = relative.split('/');
    final niveauFromPath = parts.isNotEmpty ? parts[0] : '';
    final matiereFromPath = parts.length > 1 ? parts[1] : '';

    dynamic raw;
    try {
      raw = jsonDecode(file.readAsStringSync());
    } on FormatException catch (e) {
      errors.add('$relative : JSON invalide (${e.message})');
      continue;
    }

    final List items;
    String? courseLabel;
    if (raw is List) {
      items = raw;
    } else if (raw is Map) {
      items = raw['resources'] is List ? raw['resources'] as List : const [];
      for (final key in ['nom', 'name', 'label']) {
        final v = raw[key];
        if (v is String && v.trim().isNotEmpty) {
          courseLabel = v.trim();
          break;
        }
      }
    } else {
      items = const [];
    }

    for (final item in items.whereType<Map>()) {
      final rawChapitre = item['chapitre'];
      final sousRessources = rawChapitre is List
          ? rawChapitre
              .whereType<Map>()
              .where((s) => s['url'] is String)
              .map((s) => {
                    'titre': s['titre'] ?? s['url'],
                    'url': s['url'],
                    if (s['type'] != null) 'type': s['type'],
                  })
              .toList()
          : null;

      resources.add({
        'niveau': _str(item['niveau']).isNotEmpty ? _str(item['niveau']) : niveauFromPath,
        'matiere': _str(item['matiere']).isNotEmpty ? _str(item['matiere']) : matiereFromPath,
        'chapitre': rawChapitre is String ? rawChapitre : '',
        'titre': _str(item['titre']),
        'type': _str(item['type']).isNotEmpty ? _str(item['type']) : 'link',
        'source': _str(item['source']),
        'url': _str(item['url']),
        if (sousRessources != null && sousRessources.isNotEmpty) 'sousRessources': sousRessources,
        'sourceFile': relative,
        'courseLabel': courseLabel ?? parts.last,
      });
    }
  }

  // generic_data.json : ordre des niveaux, palettes et icônes.
  Map<String, dynamic> styles = {};
  List ordreNiveaux = [];
  final genericFile = File('${resourcesDir.path}/generic_data.json');
  if (genericFile.existsSync()) {
    final generic = jsonDecode(genericFile.readAsStringSync()) as Map<String, dynamic>;
    styles = (generic['styles'] as Map<String, dynamic>?) ?? {};
    ordreNiveaux = (generic['niveaux'] as List?) ?? [];
  }

  final catalog = {
    'ordreNiveaux': ordreNiveaux,
    'styles': styles,
    'resources': resources,
  };

  final out = File('${projectDir.path}/assets/catalog.json');
  out.parent.createSync(recursive: true);
  out.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(catalog));

  stdout.writeln('${resources.length} ressources (${files.length} fichiers) → ${out.path}');
  if (errors.isNotEmpty) {
    stderr.writeln('Fichiers ignorés :');
    for (final e in errors) {
      stderr.writeln('  - $e');
    }
    exitCode = 2;
  }
}

String _str(dynamic v) => v is String ? v.trim() : '';
