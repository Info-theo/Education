import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'catalog.dart';
import 'models.dart';

const ink = Color(0xFF17324D);
const muted = Color(0xFF56708F);
const line = Color(0xFFDBE6F7);

Future<void> openUrl(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  final ok = uri != null && await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Impossible d'ouvrir le lien : $url")),
    );
  }
}

/// Fond dégradé commun + largeur maximale centrée.
class PageFrame extends StatelessWidget {
  const PageFrame({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFFFFF), Color(0xFFEEF5FF), Color(0xFFEDF2FB)],
        ),
      ),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 48),
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1180),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: children,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// En-tête : sur-titre, titre et indicateur des 3 étapes.
class StepHeader extends StatelessWidget {
  const StepHeader({super.key, required this.step, required this.title});

  final int step;
  final String title;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    const labels = ['Ta classe', 'Ta matière', 'Les ressources'];

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: line),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white, Color.lerp(Colors.white, accent, 0.08)!],
        ),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 30, offset: Offset(0, 14))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'RESSOURCES PÉDAGOGIQUES',
            style: TextStyle(color: accent, fontWeight: FontWeight.w800, letterSpacing: 2.4, fontSize: 12),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, height: 1.15, color: ink),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var i = 0; i < labels.length; i++) _StepPill(n: i + 1, label: labels[i], current: step),
            ],
          ),
        ],
      ),
    );
  }
}

class _StepPill extends StatelessWidget {
  const _StepPill({required this.n, required this.label, required this.current});

  final int n;
  final String label;
  final int current;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final isCurrent = n == current;
    final isDone = n < current;

    return Container(
      padding: const EdgeInsets.fromLTRB(6, 6, 12, 6),
      decoration: BoxDecoration(
        color: isCurrent ? accent : Colors.white.withOpacity(0.85),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: isCurrent ? accent : line),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 13,
            backgroundColor: isCurrent
                ? Colors.white.withOpacity(0.25)
                : isDone
                    ? accent.withOpacity(0.12)
                    : const Color(0xFFE8EEF8),
            child: Text(
              isDone ? '✓' : '$n',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: isCurrent ? Colors.white : (isDone ? accent : muted),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: isCurrent ? Colors.white : (isDone ? ink : muted),
            ),
          ),
        ],
      ),
    );
  }
}

/// Fil d'Ariane cliquable.
class Breadcrumb extends StatelessWidget {
  const Breadcrumb({super.key, required this.items});

  /// (libellé, action) — action nulle pour l'élément courant.
  final List<(String, VoidCallback?)> items;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0) const Text(' › ', style: TextStyle(color: muted, fontWeight: FontWeight.w700)),
            TextButton(
              onPressed: items[i].$2,
              style: TextButton.styleFrom(
                foregroundColor: accent,
                disabledForegroundColor: ink,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 36),
                textStyle: const TextStyle(fontWeight: FontWeight.w700),
              ),
              child: Text(items[i].$1),
            ),
          ],
        ],
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle({super.key, required this.eyebrow, required this.title, this.trailing});

  final String eyebrow;
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.only(top: 20, bottom: 14),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.end,
        spacing: 12,
        runSpacing: 10,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(eyebrow.toUpperCase(),
                  style: TextStyle(color: accent, fontWeight: FontWeight.w800, letterSpacing: 2.4, fontSize: 12)),
              const SizedBox(height: 4),
              Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: ink)),
            ],
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// Grille responsive : colonnes de largeur minimale [minWidth].
class ResponsiveWrap extends StatelessWidget {
  const ResponsiveWrap({super.key, required this.minWidth, required this.children, this.spacing = 14});

  final double minWidth;
  final double spacing;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final columns = (constraints.maxWidth / (minWidth + spacing)).floor().clamp(1, 6);
      final width = (constraints.maxWidth - spacing * (columns - 1)) / columns;
      return Wrap(
        spacing: spacing,
        runSpacing: spacing,
        children: [for (final c in children) SizedBox(width: width, child: c)],
      );
    });
  }
}

/// Tuile cliquable (cycle, niveau, matière).
class ChoiceTile extends StatelessWidget {
  const ChoiceTile({
    super.key,
    required this.icon,
    required this.title,
    required this.onTap,
    this.palette = Palette.neutral,
    this.hint,
    this.count,
    this.selected = false,
    this.compact = false,
  });

  final String icon;
  final String title;
  final String? hint;
  final String? count;
  final Palette palette;
  final bool selected;
  final bool compact;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final strong = palette == Palette.neutral ? Theme.of(context).colorScheme.primary : palette.selected;

    final content = compact
        ? Row(children: [
            Text(icon, style: const TextStyle(fontSize: 24)),
            const SizedBox(width: 10),
            Flexible(
              child: Text(title,
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: palette.text)),
            ),
          ])
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(icon, style: const TextStyle(fontSize: 32)),
              const SizedBox(height: 8),
              Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: palette.text)),
              if (hint != null) ...[
                const SizedBox(height: 4),
                Text(hint!, style: const TextStyle(color: muted)),
              ],
              if (count != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: palette.base, borderRadius: BorderRadius.circular(999)),
                  child: Text(count!, style: TextStyle(color: strong, fontWeight: FontWeight.w800, fontSize: 13)),
                ),
              ],
            ],
          );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: EdgeInsets.all(compact ? 14 : 18),
          constraints: BoxConstraints(minHeight: compact ? 0 : 150),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: selected ? strong : palette.border, width: selected ? 3 : 1),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Colors.white, palette.base],
            ),
            boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 20, offset: Offset(0, 8))],
          ),
          child: content,
        ),
      ),
    );
  }
}

/// Carte de ressource : badge de type, source + favicon, miniature YouTube, parties, bouton.
class ResourceCard extends StatelessWidget {
  const ResourceCard({super.key, required this.resource, required this.palette});

  final Resource resource;
  final Palette palette;

  @override
  Widget build(BuildContext context) {
    final r = resource;
    final (typeIcon, typeLabel, action) = switch (r.kind) {
      ResourceKind.video => ('🎬', 'Vidéo', 'Regarder'),
      ResourceKind.iframe => ('🖼️', 'Intégré', 'Ouvrir'),
      ResourceKind.site => ('🌐', 'Site web', 'Ouvrir le site'),
    };
    final ytId = r.youtubeId;

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: palette.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: palette.border),
        boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 20, offset: Offset(0, 8))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (ytId != null)
            InkWell(
              onTap: () => openUrl(context, r.url),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Stack(fit: StackFit.expand, children: [
                  Image.network(
                    'https://i.ytimg.com/vi/$ytId/hqdefault.jpg',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const ColoredBox(color: Color(0xFF0F172A)),
                  ),
                  const Center(
                    child: Icon(Icons.play_circle_fill, size: 56, color: Colors.white),
                  ),
                ]),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(spacing: 6, runSpacing: 6, children: [
                  _Tag(text: '$typeIcon $typeLabel', bg: palette.base, fg: palette.text),
                  if (r.chapitre.isNotEmpty)
                    _Tag(text: r.chapitre, bg: Colors.white, fg: muted, border: palette.border),
                ]),
                const SizedBox(height: 10),
                Text(r.titre,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, height: 1.3, color: ink)),
                if (r.source.isNotEmpty || r.host.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(children: [
                    if (r.host.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: Image.network(
                            'https://${r.host}/favicon.ico',
                            width: 16,
                            height: 16,
                            errorBuilder: (_, __, ___) => const Icon(Icons.public, size: 16, color: muted),
                          ),
                        ),
                      ),
                    Expanded(
                      child: Text(r.source.isNotEmpty ? r.source : r.host,
                          style: const TextStyle(color: muted, fontSize: 14)),
                    ),
                  ]),
                ],
                if (r.sousRessources.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      childrenPadding: EdgeInsets.zero,
                      iconColor: palette.selected,
                      collapsedIconColor: palette.selected,
                      title: Text(plural(r.sousRessources.length, 'partie'),
                          style: TextStyle(color: palette.selected, fontWeight: FontWeight.w700)),
                      children: [
                        for (final sub in r.sousRessources)
                          ListTile(
                            dense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            hoverColor: palette.base,
                            title: Text(sub.titre, style: const TextStyle(fontWeight: FontWeight.w600)),
                            trailing: const Icon(Icons.open_in_new, size: 16),
                            onTap: () => openUrl(context, sub.url),
                          ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: () => openUrl(context, r.url),
                  style: FilledButton.styleFrom(
                    backgroundColor: palette == Palette.neutral
                        ? Theme.of(context).colorScheme.primary
                        : palette.selected,
                    textStyle: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  icon: const Icon(Icons.open_in_new, size: 18),
                  label: Text(action),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.text, required this.bg, required this.fg, this.border});

  final String text;
  final Color bg;
  final Color fg;
  final Color? border;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: border == null ? null : Border.all(color: border!),
      ),
      child: Text(text, style: TextStyle(color: fg, fontSize: 12.5, fontWeight: FontWeight.w800)),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: line),
      ),
      child: Column(children: [
        const Text('🔍', style: TextStyle(fontSize: 40)),
        const SizedBox(height: 8),
        const Text('Rien par ici pour le moment',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: ink)),
        const SizedBox(height: 4),
        const Text("Aucune ressource n'est encore disponible pour ce choix.", style: TextStyle(color: muted)),
        const SizedBox(height: 14),
        FilledButton(onPressed: onBack, child: const Text('← Revenir en arrière')),
      ]),
    );
  }
}
