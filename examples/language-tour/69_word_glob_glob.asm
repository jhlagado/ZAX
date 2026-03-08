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
push DE                        ; 010B: D5
ld de, glob_words              ; 010C: 11 00 00
ld hl, (glob_idx_word)         ; 010F: 2A 00 00
add HL, HL                     ; 0112: 29
add HL, DE                     ; 0113: 19
ld E, (HL)                     ; 0114: 5E
inc HL                         ; 0115: 23
ld D, (HL)                     ; 0116: 56
ld L, E                        ; 0117: 6B
ld H, D                        ; 0118: 62
pop DE                         ; 0119: D1
push DE                        ; 011A: D5
ex DE, HL                      ; 011B: EB
push AF                        ; 011C: F5
push BC                        ; 011D: C5
push DE                        ; 011E: D5
ld hl, (glob_idx_word)         ; 011F: 2A 00 00
push HL                        ; 0122: E5
pop HL                         ; 0123: E1
add HL, HL                     ; 0124: 29
push HL                        ; 0125: E5
ld HL, glob_words              ; 0126: 21 00 00
pop DE                         ; 0129: D1
add HL, DE                     ; 012A: 19
push HL                        ; 012B: E5
pop HL                         ; 012C: E1
pop DE                         ; 012D: D1
pop BC                         ; 012E: C1
pop AF                         ; 012F: F1
ld (hl), E                     ; 0130: 73
inc HL                         ; 0131: 23
ld (hl), D                     ; 0132: 72
ex DE, HL                      ; 0133: EB
pop DE                         ; 0134: D1
__zax_epilogue_0:
pop DE                         ; 0135: D1
pop BC                         ; 0136: C1
pop AF                         ; 0137: F1
ld SP, IX                      ; 0138: DD F9
pop IX                         ; 013A: DD E1
ret                            ; 013C: C9
; func main begin
; func word_glob_glob end
main:
push IX                        ; 013D: DD E5
ld IX, $0000                   ; 013F: DD 21 00 00
add IX, SP                     ; 0143: DD 39
push AF                        ; 0145: F5
push BC                        ; 0146: C5
push DE                        ; 0147: D5
push HL                        ; 0148: E5
call word_glob_glob            ; 0149: CD 00 00
__zax_epilogue_1:
pop HL                         ; 014C: E1
pop DE                         ; 014D: D1
pop BC                         ; 014E: C1
pop AF                         ; 014F: F1
ld SP, IX                      ; 0150: DD F9
pop IX                         ; 0152: DD E1
ret                            ; 0154: C9
; func main end

; symbols:
; label word_glob_glob = $0100
; label __zax_epilogue_0 = $0135
; label main = $013D
; label __zax_epilogue_1 = $014C
; data glob_words = $2000
; data glob_idx_word = $2010
; label __zax_startup = $2012
