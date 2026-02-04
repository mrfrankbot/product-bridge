{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.npm-9_x
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
    pkgs.git
  ];
}