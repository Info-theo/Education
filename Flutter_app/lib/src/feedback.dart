// Notes et suggestions : liens vers les formulaires d'issue GitHub du dépôt
// (.github/ISSUE_TEMPLATE/note.yml et suggestion.yml), pré-remplis depuis l'app.
// Les réponses arrivent dans l'onglet Issues ; `node tools/feedback.mjs` les récupère.
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';
import 'widgets.dart';

const feedbackRepo = String.fromEnvironment('FEEDBACK_REPO', defaultValue: 'Info-theo/Education');

/// Libellés des notes : doivent correspondre aux options du formulaire note.yml.
const noteLabels = {
  5: '5 - Excellent',
  4: '4 - Bien',
  3: '3 - Moyen',
  2: '2 - Décevant',
  1: '1 - Inutile ou hors programme',
};

String _issueUrl(String template, Map<String, String?> fields) => Uri.https(
      'github.com',
      '/$feedbackRepo/issues/new',
      {
        'template': template,
        for (final e in fields.entries)
          if (e.value != null && e.value!.isNotEmpty) e.key: e.value!,
      },
    ).toString();

String rateUrl(Resource r, [int? note]) => _issueUrl('note.yml', {
      'title': '[Note] ${r.titre} (${r.niveau} · ${r.matiere})',
      'url': r.url,
      'ressource': r.titre,
      'contexte': '${r.niveau} · ${r.matiere}',
      'note': noteLabels[note],
    });

String suggestUrl({String? niveau, String? matiere}) => _issueUrl('suggestion.yml', {
      'title': '[Suggestion] ${[niveau, matiere].whereType<String>().join(' · ')}'.trim(),
      'niveau': niveau,
      'matiere': matiere,
    });

const _ratingsKey = 'education:notes';

/// Cinq étoiles : un appui ouvre le formulaire de note pré-rempli.
/// La note donnée est mémorisée sur l'appareil uniquement.
class StarRating extends StatefulWidget {
  const StarRating({super.key, required this.resource});

  final Resource resource;

  @override
  State<StarRating> createState() => _StarRatingState();
}

class _StarRatingState extends State<StarRating> {
  int? _given;

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((prefs) {
      final all = _decode(prefs.getString(_ratingsKey));
      if (mounted) setState(() => _given = all[widget.resource.url]);
    });
  }

  static Map<String, int> _decode(String? raw) {
    try {
      return (jsonDecode(raw ?? '{}') as Map).map((k, v) => MapEntry(k as String, (v as num).toInt()));
    } catch (_) {
      return {};
    }
  }

  Future<void> _rate(int note) async {
    setState(() => _given = note);
    final prefs = await SharedPreferences.getInstance();
    final all = _decode(prefs.getString(_ratingsKey))..[widget.resource.url] = note;
    await prefs.setString(_ratingsKey, jsonEncode(all));
    if (mounted) await openUrl(context, rateUrl(widget.resource, note));
  }

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Text(_given == null ? 'Noter :' : 'Ta note : $_given/5',
          style: const TextStyle(color: muted, fontWeight: FontWeight.w700, fontSize: 13)),
      const SizedBox(width: 4),
      for (var n = 1; n <= 5; n++)
        IconButton(
          tooltip: '$n/5 : ouvre le formulaire de note',
          visualDensity: VisualDensity.compact,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
          onPressed: () => _rate(n),
          icon: Icon(
            n <= (_given ?? 0) ? Icons.star_rounded : Icons.star_outline_rounded,
            color: n <= (_given ?? 0) ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
          ),
        ),
    ]);
  }
}
