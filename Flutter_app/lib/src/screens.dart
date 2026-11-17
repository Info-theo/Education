import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'catalog.dart';
import 'feedback.dart';
import 'models.dart';
import 'widgets.dart';

const _lastLevelKey = 'education:dernier-niveau';
const allSubjects = '__toutes__';

/// Filtre par catégorie, conservé d'une matière à l'autre pendant la session.
Category? _lastCategory;

/// Thème d'ambiance : la couleur du niveau choisi devient la couleur principale.
Widget withLevelTheme(BuildContext context, Palette palette, Widget child) {
  if (palette == Palette.neutral) return child;
  final base = Theme.of(context);
  return Theme(
    data: base.copyWith(
      colorScheme: ColorScheme.fromSeed(seedColor: palette.selected).copyWith(primary: palette.selected),
    ),
    child: child,
  );
}

/* ------------------------------------------------------------------ */
/* Étape 1 : la classe                                                 */
/* ------------------------------------------------------------------ */

class LevelsScreen extends StatefulWidget {
  const LevelsScreen({super.key, required this.catalog});

  final Catalog catalog;

  @override
  State<LevelsScreen> createState() => _LevelsScreenState();
}

class _LevelsScreenState extends State<LevelsScreen> {
  String? _openCycle;
  String? _lastLevel;

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((prefs) {
      if (mounted) setState(() => _lastLevel = prefs.getString(_lastLevelKey));
    }).catchError((_) {});
  }

  Future<void> _chooseLevel(String niveau) async {
    setState(() => _lastLevel = niveau);
    try {
      (await SharedPreferences.getInstance()).setString(_lastLevelKey, niveau);
    } catch (_) {
      // stockage indisponible : on ignore
    }
    if (!mounted) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => SubjectsScreen(catalog: widget.catalog, niveau: niveau),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final catalog = widget.catalog;
    final cyclesList = catalog.availableCycles;
    final open = cyclesList.where((c) => c.id == _openCycle).firstOrNull;
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      body: PageFrame(children: [
        const StepHeader(step: 1, title: 'Trouve des cours et des vidéos pour réviser, du CP à la fac.'),
        if (_lastLevel != null && catalog.levels.contains(_lastLevel)) ...[
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: accent.withOpacity(0.07),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: accent.withOpacity(0.6)),
            ),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 12,
              runSpacing: 10,
              children: [
                Text('👋 Content de te revoir ! Tu étais en $_lastLevel.',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: ink)),
                FilledButton(
                  onPressed: () => _chooseLevel(_lastLevel!),
                  child: Text('Reprendre en $_lastLevel →'),
                ),
              ],
            ),
          ),
        ],
        const SectionTitle(eyebrow: 'Étape 1', title: 'Tu es en quelle classe ?'),
        ResponsiveWrap(
          minWidth: 220,
          children: [
            for (final c in cyclesList)
              ChoiceTile(
                icon: c.icon,
                title: c.label,
                hint: c.hint,
                count: plural(c.levels.fold(0, (s, n) => s + catalog.countForLevel(n)), 'ressource'),
                selected: c.id == _openCycle,
                onTap: () => setState(() => _openCycle = _openCycle == c.id ? null : c.id),
              ),
          ],
        ),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: open == null
              ? const SizedBox.shrink()
              : Container(
                  key: ValueKey(open.id),
                  width: double.infinity,
                  margin: const EdgeInsets.only(top: 18),
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.94),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${open.icon} ${open.label} : choisis ta classe',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: ink)),
                      const SizedBox(height: 12),
                      ResponsiveWrap(
                        minWidth: 140,
                        children: [
                          for (final n in open.levels)
                            ChoiceTile(
                              compact: true,
                              icon: catalog.levelIcon(n),
                              title: n,
                              palette: catalog.levelPalette(n),
                              onTap: () => _chooseLevel(n),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
        ),
      ]),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Étape 2 : la matière                                                */
/* ------------------------------------------------------------------ */

class SubjectsScreen extends StatelessWidget {
  const SubjectsScreen({super.key, required this.catalog, required this.niveau});

  final Catalog catalog;
  final String niveau;

  @override
  Widget build(BuildContext context) {
    final subjects = catalog.subjectsFor(niveau);
    final total = catalog.countForLevel(niveau);

    void open(String matiere) => Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => ResourcesScreen(catalog: catalog, niveau: niveau, matiere: matiere),
        ));

    return withLevelTheme(
      context,
      catalog.levelPalette(niveau),
      Scaffold(
        body: PageFrame(children: [
          StepHeader(step: 2, title: "En $niveau, qu'est-ce que tu veux réviser ?"),
          Breadcrumb(items: [
            ('🏠 Accueil', () => Navigator.of(context).popUntil((r) => r.isFirst)),
            ('${catalog.levelIcon(niveau)} $niveau', null),
          ]),
          SectionTitle(
            eyebrow: 'Étape 2',
            title: 'Choisis ta matière',
            trailing: Text('${plural(total, 'ressource')} en $niveau', style: const TextStyle(color: muted)),
          ),
          if (subjects.isEmpty)
            EmptyState(onBack: () => Navigator.of(context).pop())
          else
            ResponsiveWrap(
              minWidth: 220,
              children: [
                for (final s in subjects)
                  ChoiceTile(
                    icon: catalog.subjectIcon(s.key),
                    title: s.key,
                    count: plural(s.value, 'ressource'),
                    palette: catalog.subjectPalette(s.key),
                    onTap: () => open(s.key),
                  ),
                ChoiceTile(
                  icon: '✨',
                  title: 'Tout voir',
                  hint: 'Toutes les matières de $niveau',
                  count: plural(total, 'ressource'),
                  onTap: () => open(allSubjects),
                ),
              ],
            ),
        ]),
      ),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Étape 3 : les ressources                                            */
/* ------------------------------------------------------------------ */

class ResourcesScreen extends StatefulWidget {
  const ResourcesScreen({super.key, required this.catalog, required this.niveau, required this.matiere});

  final Catalog catalog;
  final String niveau;
  final String matiere;

  @override
  State<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends State<ResourcesScreen> {
  String? _course;
  Category? _category = _lastCategory;

  void _setCategory(Category? value) => setState(() => _category = _lastCategory = value);

  static const _natureOrder = [Category.cours, Category.exercices, Category.ressource];

  bool get _all => widget.matiere == allSubjects;

  @override
  Widget build(BuildContext context) {
    final catalog = widget.catalog;
    final niveau = widget.niveau;
    final label = _all ? 'Toutes les matières' : widget.matiere;

    final ofSubject =
        catalog.forLevel(niveau).where((r) => _all || r.matiere == widget.matiere).toList();

    // Cours disponibles (un fichier cours*.json = un cours).
    final courses = <String, String>{};
    if (!_all) {
      for (final r in ofSubject) {
        courses.putIfAbsent(r.sourceFile, () => r.courseLabel);
      }
    }

    final ofCourse = _course == null ? ofSubject : ofSubject.where((r) => r.sourceFile == _course).toList();
    final counts = {for (final c in Category.values) c: ofCourse.where((r) => r.matches(c)).length};

    // Filtre par catégorie, puis cours complets en premier (tri stable).
    final filtered = _category == null ? ofCourse : ofCourse.where((r) => r.matches(_category!)).toList();
    final results = [
      for (final n in _natureOrder) ...filtered.where((r) => r.nature == n),
    ];

    // Regroupement : par matière en vue « tout voir », sinon par chapitre.
    final groups = <String, List<Resource>>{};
    for (final r in results) {
      final key = _all ? r.matiere : (r.chapitre.isEmpty ? 'Ressources générales' : r.chapitre);
      groups.putIfAbsent(key, () => []).add(r);
    }

    return withLevelTheme(
      context,
      catalog.levelPalette(niveau),
      Builder(builder: (context) {
        final accent = Theme.of(context).colorScheme.primary;
        return Scaffold(
          body: PageFrame(children: [
            StepHeader(step: 3, title: '$label · $niveau'),
            Breadcrumb(items: [
              ('🏠 Accueil', () => Navigator.of(context).popUntil((r) => r.isFirst)),
              ('${catalog.levelIcon(niveau)} $niveau', () => Navigator.of(context).pop()),
              ('${_all ? '✨' : catalog.subjectIcon(widget.matiere)} $label', null),
            ]),
            SectionTitle(
              eyebrow: 'Étape 3',
              title: _category == null
                  ? '${plural(results.length, 'ressource')} pour toi'
                  : '${results.length} · ${_category!.label}',
              trailing: courses.length > 1
                  ? SegmentedButton<String?>(
                      showSelectedIcon: false,
                      segments: [
                        const ButtonSegment(value: null, label: Text('Tous')),
                        for (final e in courses.entries) ButtonSegment(value: e.key, label: Text(e.value)),
                      ],
                      selected: {_course},
                      onSelectionChanged: (s) => setState(() => _course = s.first),
                    )
                  : null,
            ),
            Wrap(spacing: 8, runSpacing: 8, children: [
              ChoiceChip(
                label: Text('Tout (${ofCourse.length})'),
                selected: _category == null,
                onSelected: (_) => _setCategory(null),
              ),
              for (final c in Category.values)
                if (counts[c]! > 0 || c == _category)
                  Tooltip(
                    message: c.hint,
                    child: ChoiceChip(
                      label: Text('${c.icon} ${c.label} (${counts[c]})'),
                      selected: _category == c,
                      onSelected: (on) => _setCategory(on ? c : null),
                    ),
                  ),
            ]),
            if (_category != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_category!.hint, style: const TextStyle(color: muted)),
              ),
            const SizedBox(height: 16),
            if (groups.isEmpty && _category != null && ofCourse.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Column(children: [
                    Text(_category!.icon, style: const TextStyle(fontSize: 40)),
                    const SizedBox(height: 8),
                    Text('Pas encore de « ${_category!.label.toLowerCase()} » ici',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: ink)),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => _setCategory(null),
                      child: Text('Tout afficher (${ofCourse.length})'),
                    ),
                  ]),
                ),
              )
            else if (groups.isEmpty)
              EmptyState(onBack: () => Navigator.of(context).pop()),
            const SizedBox(height: 8),
            Card(
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: line),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text('💡 Tu connais une bonne ressource pour ${_all ? 'la $niveau' : '$label en $niveau'} ?',
                        style: const TextStyle(fontWeight: FontWeight.w700, color: ink)),
                    FilledButton.tonal(
                      onPressed: () => openUrl(
                        context,
                        suggestUrl(niveau: niveau, matiere: _all ? null : widget.matiere),
                      ),
                      child: const Text('Suggérer une ressource ↗'),
                    ),
                  ],
                ),
              ),
            ),
            for (final g in groups.entries) ...[
              Padding(
                padding: const EdgeInsets.only(top: 8, bottom: 12),
                child: Row(children: [
                  Text('${_all ? catalog.subjectIcon(g.key) : '📌'} ${g.key}',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: ink)),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 2),
                    decoration: BoxDecoration(
                      color: accent.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text('${g.value.length}',
                        style: TextStyle(color: accent, fontWeight: FontWeight.w800, fontSize: 12)),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(child: Divider(color: line)),
                ]),
              ),
              ResponsiveWrap(
                minWidth: 300,
                spacing: 16,
                children: [
                  for (final r in g.value) ResourceCard(resource: r, palette: catalog.subjectPalette(r.matiere)),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ]),
        );
      }),
    );
  }
}
