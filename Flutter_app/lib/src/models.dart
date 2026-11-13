import 'package:flutter/material.dart';

/// Palette de couleurs d'un niveau ou d'une matière (generic_data.json).
class Palette {
  const Palette({
    required this.base,
    required this.selected,
    required this.border,
    required this.text,
    required this.card,
  });

  final Color base;
  final Color selected;
  final Color border;
  final Color text;
  final Color card;

  static const neutral = Palette(
    base: Color(0xFFF1F5F9),
    selected: Color(0xFF4B6BFF),
    border: Color(0xFFCBD5E1),
    text: Color(0xFF334155),
    card: Color(0xFFFFFFFF),
  );

  factory Palette.fromJson(Map<String, dynamic> json) {
    Color pick(String key, Color fallback) => _parseHex(json[key]) ?? fallback;
    return Palette(
      base: pick('base', neutral.base),
      selected: pick('selected', neutral.selected),
      border: pick('border', neutral.border),
      text: pick('text', neutral.text),
      card: pick('card', neutral.card),
    );
  }

  static Color? _parseHex(dynamic value) {
    if (value is! String) return null;
    var hex = value.replaceFirst('#', '');
    if (hex.length == 3) hex = hex.split('').map((c) => '$c$c').join();
    if (hex.length != 6) return null;
    final v = int.tryParse(hex, radix: 16);
    return v == null ? null : Color(0xFF000000 | v);
  }
}

class SubResource {
  const SubResource({required this.titre, required this.url});

  final String titre;
  final String url;

  factory SubResource.fromJson(Map<String, dynamic> json) =>
      SubResource(titre: json['titre'] as String? ?? '', url: json['url'] as String? ?? '');
}

enum ResourceKind { video, iframe, site }

class Resource {
  const Resource({
    required this.niveau,
    required this.matiere,
    required this.chapitre,
    required this.titre,
    required this.type,
    required this.source,
    required this.url,
    required this.sousRessources,
    required this.sourceFile,
    required this.courseLabel,
  });

  final String niveau;
  final String matiere;
  final String chapitre;
  final String titre;
  final String type;
  final String source;
  final String url;
  final List<SubResource> sousRessources;
  final String sourceFile;
  final String courseLabel;

  factory Resource.fromJson(Map<String, dynamic> json) => Resource(
        niveau: json['niveau'] as String? ?? '',
        matiere: json['matiere'] as String? ?? '',
        chapitre: json['chapitre'] as String? ?? '',
        titre: json['titre'] as String? ?? '',
        type: json['type'] as String? ?? 'link',
        source: json['source'] as String? ?? '',
        url: json['url'] as String? ?? '',
        sousRessources: (json['sousRessources'] as List? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(SubResource.fromJson)
            .toList(),
        sourceFile: json['sourceFile'] as String? ?? '',
        courseLabel: json['courseLabel'] as String? ?? '',
      );

  Uri? get uri => Uri.tryParse(url);

  String get host => (uri?.host ?? '').replaceFirst(RegExp(r'^www\.'), '');

  bool get isYoutube => host.endsWith('youtube.com') || host == 'youtu.be';

  ResourceKind get kind {
    if (type == 'video' || isYoutube) return ResourceKind.video;
    if (type == 'iframe') return ResourceKind.iframe;
    return ResourceKind.site;
  }

  /// Identifiant de vidéo YouTube (absent pour les playlists).
  String? get youtubeId {
    final u = uri;
    if (u == null) return null;
    if (u.host == 'youtu.be') return u.pathSegments.isNotEmpty ? u.pathSegments.first : null;
    if (isYoutube) return u.queryParameters['v'];
    return null;
  }
}

/// Cycle scolaire regroupant plusieurs niveaux.
class Cycle {
  const Cycle({
    required this.id,
    required this.label,
    required this.icon,
    required this.hint,
    required this.levels,
  });

  final String id;
  final String label;
  final String icon;
  final String hint;
  final List<String> levels;

  Cycle withLevels(List<String> levels) =>
      Cycle(id: id, label: label, icon: icon, hint: hint, levels: levels);
}

const cycles = <Cycle>[
  Cycle(id: 'primaire', label: 'Primaire', icon: '🎒', hint: 'Du CP au CM2', levels: ['CP', 'CE1', 'CE2', 'CM1', 'CM2']),
  Cycle(id: 'college', label: 'Collège', icon: '🏫', hint: 'De la 6ème à la 3ème', levels: ['6ème', '5ème', '4ème', '3ème']),
  Cycle(id: 'lycee', label: 'Lycée', icon: '🎓', hint: 'De la Seconde à la Terminale', levels: ['Seconde', 'Première', 'Terminale']),
  Cycle(id: 'superieur', label: 'Supérieur', icon: '🔬', hint: 'Licence et master', levels: ['L1', 'L2', 'L3', 'M1', 'M2']),
];
