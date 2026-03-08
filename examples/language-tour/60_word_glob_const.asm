; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_glob_const begin
word_glob_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld HL, glob_words + 2          ; 010E: 21 00 00
pop DE                         ; 0111: D1
pop BC                         ; 0112: C1
pop AF                         ; 0113: F1
push DE                        ; 0114: D5
ld E, (HL)                     ; 0115: 5E
inc HL                         ; 0116: 23
ld D, (HL)                     ; 0117: 56
ld L, E                        ; 0118: 6B
ld H, D                        ; 0119: 62
pop DE                         ; 011A: D1
push DE                        ; 011B: D5
ex DE, HL                      ; 011C: EB
push AF                        ; 011D: F5
push BC                        ; 011E: C5
push DE                        ; 011F: D5
ld HL, glob_words + 4          ; 0120: 21 00 00
pop DE                         ; 0123: D1
pop BC                         ; 0124: C1
pop AF                         ; 0125: F1
ld (HL), E                     ; 0126: 73
inc HL                         ; 0127: 23
ld (HL), D                     ; 0128: 72
ex DE, HL                      ; 0129: EB
pop DE                         ; 012A: D1
__zax_epilogue_0:
pop DE                         ; 012B: D1
pop BC                         ; 012C: C1
pop AF                         ; 012D: F1
ld SP, IX                      ; 012E: DD F9
pop IX                         ; 0130: DD E1
ret                            ; 0132: C9
; func main begin
; func word_glob_const end
main:
push IX                        ; 0133: DD E5
ld IX, $0000                   ; 0135: DD 21 00 00
add IX, SP                     ; 0139: DD 39
push AF                        ; 013B: F5
push BC                        ; 013C: C5
push DE                        ; 013D: D5
push HL                        ; 013E: E5
call word_glob_const           ; 013F: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0142: E1
pop DE                         ; 0143: D1
pop BC                         ; 0144: C1
pop AF                         ; 0145: F1
ld SP, IX                      ; 0146: DD F9
pop IX                         ; 0148: DD E1
ret                            ; 014A: C9
; func main end

; symbols:
; label word_glob_const = $0100
; label __zax_epilogue_0 = $012B
; label main = $0133
; label __zax_epilogue_1 = $0142
; data glob_words = $2000
; label __zax_startup = $2010
