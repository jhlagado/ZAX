; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_fvar_const begin
word_fvar_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld E, (IX + $0004)             ; 010E: DD 5E 04
ld D, (IX + $0005)             ; 0111: DD 56 05
ex DE, HL                      ; 0114: EB
ld DE, $0004                   ; 0115: 11 04 00
add HL, DE                     ; 0118: 19
push HL                        ; 0119: E5
pop HL                         ; 011A: E1
pop DE                         ; 011B: D1
pop BC                         ; 011C: C1
pop AF                         ; 011D: F1
push DE                        ; 011E: D5
ld E, (HL)                     ; 011F: 5E
inc HL                         ; 0120: 23
ld D, (HL)                     ; 0121: 56
ld L, E                        ; 0122: 6B
ld H, D                        ; 0123: 62
pop DE                         ; 0124: D1
push DE                        ; 0125: D5
ex DE, HL                      ; 0126: EB
push AF                        ; 0127: F5
push BC                        ; 0128: C5
push DE                        ; 0129: D5
ld E, (IX + $0004)             ; 012A: DD 5E 04
ld D, (IX + $0005)             ; 012D: DD 56 05
ex DE, HL                      ; 0130: EB
ld DE, $0006                   ; 0131: 11 06 00
add HL, DE                     ; 0134: 19
push HL                        ; 0135: E5
pop HL                         ; 0136: E1
pop DE                         ; 0137: D1
pop BC                         ; 0138: C1
pop AF                         ; 0139: F1
ld (hl), E                     ; 013A: 73
inc HL                         ; 013B: 23
ld (hl), D                     ; 013C: 72
ex DE, HL                      ; 013D: EB
pop DE                         ; 013E: D1
__zax_epilogue_0:
pop DE                         ; 013F: D1
pop BC                         ; 0140: C1
pop AF                         ; 0141: F1
ld SP, IX                      ; 0142: DD F9
pop IX                         ; 0144: DD E1
ret                            ; 0146: C9
; func main begin
; func word_fvar_const end
main:
push IX                        ; 0147: DD E5
ld IX, $0000                   ; 0149: DD 21 00 00
add IX, SP                     ; 014D: DD 39
push AF                        ; 014F: F5
push BC                        ; 0150: C5
push DE                        ; 0151: D5
push HL                        ; 0152: E5
ld HL, glob_words              ; 0153: 21 00 00
push HL                        ; 0156: E5
call word_fvar_const           ; 0157: CD 00 00
inc SP                         ; 015A: 33
inc SP                         ; 015B: 33
__zax_epilogue_1:
pop HL                         ; 015C: E1
pop DE                         ; 015D: D1
pop BC                         ; 015E: C1
pop AF                         ; 015F: F1
ld SP, IX                      ; 0160: DD F9
pop IX                         ; 0162: DD E1
ret                            ; 0164: C9
; func main end

; symbols:
; label word_fvar_const = $0100
; label __zax_epilogue_0 = $013F
; label main = $0147
; label __zax_epilogue_1 = $015C
; data glob_words = $2000
; label __zax_startup = $2010
