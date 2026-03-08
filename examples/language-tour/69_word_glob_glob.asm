; ZAX lowered .asm trace
; range: $0100..$207B (end exclusive)

; func word_glob_glob begin
word_glob_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld hl, (glob_idx_word)         ; 010E: 2A 00 00
push HL                        ; 0111: E5
pop HL                         ; 0112: E1
add HL, HL                     ; 0113: 29
push HL                        ; 0114: E5
ld HL, glob_words              ; 0115: 21 00 00
pop DE                         ; 0118: D1
add HL, DE                     ; 0119: 19
push HL                        ; 011A: E5
pop HL                         ; 011B: E1
pop DE                         ; 011C: D1
pop BC                         ; 011D: C1
pop AF                         ; 011E: F1
push DE                        ; 011F: D5
ld E, (HL)                     ; 0120: 5E
inc HL                         ; 0121: 23
ld D, (HL)                     ; 0122: 56
ld L, E                        ; 0123: 6B
ld H, D                        ; 0124: 62
pop DE                         ; 0125: D1
push DE                        ; 0126: D5
ex DE, HL                      ; 0127: EB
push AF                        ; 0128: F5
push BC                        ; 0129: C5
push DE                        ; 012A: D5
ld hl, (glob_idx_word)         ; 012B: 2A 00 00
push HL                        ; 012E: E5
pop HL                         ; 012F: E1
add HL, HL                     ; 0130: 29
push HL                        ; 0131: E5
ld HL, glob_words              ; 0132: 21 00 00
pop DE                         ; 0135: D1
add HL, DE                     ; 0136: 19
push HL                        ; 0137: E5
pop HL                         ; 0138: E1
pop DE                         ; 0139: D1
pop BC                         ; 013A: C1
pop AF                         ; 013B: F1
ld (HL), E                     ; 013C: 73
inc HL                         ; 013D: 23
ld (HL), D                     ; 013E: 72
ex DE, HL                      ; 013F: EB
pop DE                         ; 0140: D1
__zax_epilogue_0:
pop DE                         ; 0141: D1
pop BC                         ; 0142: C1
pop AF                         ; 0143: F1
ld SP, IX                      ; 0144: DD F9
pop IX                         ; 0146: DD E1
ret                            ; 0148: C9
; func main begin
; func word_glob_glob end
main:
push IX                        ; 0149: DD E5
ld IX, $0000                   ; 014B: DD 21 00 00
add IX, SP                     ; 014F: DD 39
push AF                        ; 0151: F5
push BC                        ; 0152: C5
push DE                        ; 0153: D5
push HL                        ; 0154: E5
call word_glob_glob            ; 0155: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0158: E1
pop DE                         ; 0159: D1
pop BC                         ; 015A: C1
pop AF                         ; 015B: F1
ld SP, IX                      ; 015C: DD F9
pop IX                         ; 015E: DD E1
ret                            ; 0160: C9
; func main end

; symbols:
; label word_glob_glob = $0100
; label __zax_epilogue_0 = $0141
; label main = $0149
; label __zax_epilogue_1 = $0158
; data glob_words = $2000
; data glob_idx_word = $2010
; label __zax_startup = $2012
