; ZAX lowered .asm trace
; range: $0100..$207B (end exclusive)

; func word_fvar_glob begin
word_fvar_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld hl, (glob_idx_word)         ; 010B: 2A 00 00
push HL                        ; 010E: E5
pop HL                         ; 010F: E1
add HL, HL                     ; 0110: 29
push HL                        ; 0111: E5
ld E, (IX + $0004)             ; 0112: DD 5E 04
ld D, (IX + $0005)             ; 0115: DD 56 05
ex DE, HL                      ; 0118: EB
pop DE                         ; 0119: D1
add HL, DE                     ; 011A: 19
push HL                        ; 011B: E5
pop HL                         ; 011C: E1
push DE                        ; 011D: D5
ld E, (HL)                     ; 011E: 5E
inc HL                         ; 011F: 23
ld D, (HL)                     ; 0120: 56
ld L, E                        ; 0121: 6B
ld H, D                        ; 0122: 62
pop DE                         ; 0123: D1
push DE                        ; 0124: D5
push HL                        ; 0125: E5
ld hl, (glob_idx_word)         ; 0126: 2A 00 00
push HL                        ; 0129: E5
pop HL                         ; 012A: E1
add HL, HL                     ; 012B: 29
push HL                        ; 012C: E5
ld E, (IX + $0004)             ; 012D: DD 5E 04
ld D, (IX + $0005)             ; 0130: DD 56 05
ex DE, HL                      ; 0133: EB
pop DE                         ; 0134: D1
add HL, DE                     ; 0135: 19
push HL                        ; 0136: E5
pop HL                         ; 0137: E1
pop DE                         ; 0138: D1
ld (HL), E                     ; 0139: 73
inc HL                         ; 013A: 23
ld (HL), D                     ; 013B: 72
pop DE                         ; 013C: D1
__zax_epilogue_0:
pop DE                         ; 013D: D1
pop BC                         ; 013E: C1
pop AF                         ; 013F: F1
ld SP, IX                      ; 0140: DD F9
pop IX                         ; 0142: DD E1
ret                            ; 0144: C9
; func main begin
; func word_fvar_glob end
main:
push IX                        ; 0145: DD E5
ld IX, $0000                   ; 0147: DD 21 00 00
add IX, SP                     ; 014B: DD 39
push AF                        ; 014D: F5
push BC                        ; 014E: C5
push DE                        ; 014F: D5
push HL                        ; 0150: E5
ld HL, glob_words              ; 0151: 21 00 00
push HL                        ; 0154: E5
call word_fvar_glob            ; 0155: CD 00 00
inc SP                         ; 0158: 33
inc SP                         ; 0159: 33
__zax_epilogue_1:
pop HL                         ; 015A: E1
pop DE                         ; 015B: D1
pop BC                         ; 015C: C1
pop AF                         ; 015D: F1
ld SP, IX                      ; 015E: DD F9
pop IX                         ; 0160: DD E1
ret                            ; 0162: C9
; func main end

; symbols:
; label word_fvar_glob = $0100
; label __zax_epilogue_0 = $013D
; label main = $0145
; label __zax_epilogue_1 = $015A
; data glob_words = $2000
; data glob_idx_word = $2010
; label __zax_startup = $2012
